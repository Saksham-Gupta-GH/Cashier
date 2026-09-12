import { test, expect } from "@playwright/test";
test.use({ channel: "chrome" });

async function mount(page, fixture, handler) {
  page.on("pageerror", error => console.error("Browser error:", error.message));
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const response = await handler(path, route.request());
    await route.fulfill({ status: response?.httpStatus || 200, json: response?.body || response || { success: true, data: {} } });
  });
  await page.goto(`/tests/e2e/terminal-harness.html?fixture=${fixture}`);
}

test("uncertain cancellation stays open, then a late approval completes once", async ({ page }) => {
  let starts = 0, approved = false;
  await mount(page, "terminal", async path => {
    if (path.endsWith("/start")) { starts++; return { transactionId: 99, status: "pending" }; }
    if (path.endsWith("/cancel")) return { transactionId: 99, status: "pending" };
    if (path.endsWith("/status")) return { transactionId: 99, status: approved ? "captured" : "pending" };
  });
  await expect(page.getByRole("heading", { name: "Waiting for card" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel payment", exact: true }).click();
  await expect(page.getByText(/Cancellation is not confirmed/)).toBeVisible();
  expect(starts).toBe(1);
  await page.screenshot({ path: "test-results/terminal-pending-cancel.png" });
  approved = true;
  await expect(page.getByText("Verified approval")).toBeVisible();
  expect(starts).toBe(1);
});

test("refresh resumes the saved transaction instead of starting another charge", async ({ page }) => {
  let starts = 0;
  await mount(page, "terminal", async path => {
    if (path.endsWith("/start")) { starts++; return { transactionId: 99, status: "pending" }; }
    if (path.endsWith("/status")) return { transactionId: 99, status: "pending" };
  });
  await expect(page.getByRole("heading", { name: "Waiting for card" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Waiting for card" })).toBeVisible();
  expect(starts).toBe(1);
});

test("confirmed decline allows a fresh payment attempt", async ({ page }) => {
  const keys = [];
  await mount(page, "terminal", async (path, request) => {
    if (path.endsWith("/start")) { keys.push(request.postDataJSON().idempotencyKey); return { transactionId: keys.length, status: "pending" }; }
    if (path.endsWith("/status")) return { transactionId: keys.length, status: keys.length === 1 ? "failed" : "captured" };
  });
  await expect(page.getByRole("heading", { name: "Declined" })).toBeVisible();
  await page.getByRole("button", { name: "Retry payment", exact: true }).click();
  await expect(page.getByText("Verified approval")).toBeVisible();
  expect(keys).toHaveLength(2); expect(keys[0]).not.toBe(keys[1]);
});

test("existing saved booking resumes without calling createBooking", async ({ page }) => {
  let creates = 0, starts = 0;
  await mount(page, "checkout", async path => {
    if (path.endsWith("/checkout")) return { booking: { bookingId: 10, bookingNumber: "BK-TEST", totalAmount: 550, balanceDue: 550, status: "pending" }, pendingPayment: null };
    if (path.endsWith("/bookings")) { creates++; return { bookingId: 11 }; }
    if (path.endsWith("/start")) { starts++; return { transactionId: 99, status: "pending" }; }
    if (path.endsWith("/status")) return { transactionId: 99, status: "pending" };
  });
  await page.getByRole("button", { name: /Complete The Order/i }).click();
  await expect(page.getByText(/Continuing saved order BK-TEST/)).toBeVisible();
  expect(creates).toBe(0); expect(starts).toBe(0);
  await page.getByRole("button", { name: /Complete The Order/i }).click();
  await expect(page.getByRole("heading", { name: "Waiting for card" })).toBeVisible();
  expect(creates).toBe(0); expect(starts).toBe(1);
});

test("secondary payment modal does not close on an unconfirmed cancel", async ({ page }) => {
  await mount(page, "progress", async path => path.endsWith("/cancel") || path.endsWith("/status") ? { transactionId: 99, status: "pending" } : null);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText(/Cancellation is not confirmed/)).toBeVisible();
});

test("a lost start response retries the same payment identity", async ({ page }) => {
  const keys = [];
  await mount(page, "terminal", async (path, request) => {
    if (path.endsWith("/start")) {
      keys.push(request.postDataJSON().idempotencyKey);
      return keys.length === 1 ? { httpStatus: 502, body: { message: "Reply lost" } }
        : { transactionId: 99, status: "captured" };
    }
  });
  await expect(page.getByText("Reply lost")).toBeVisible();
  await page.getByRole("button", { name: "Check / retry payment" }).click();
  await expect(page.getByText("Verified approval")).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("pending recovery controls fit a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mount(page, "terminal", async path => path.endsWith("/start") || path.endsWith("/status")
    ? { transactionId: 99, status: "pending" } : null);
  await expect(page.getByRole("heading", { name: "Waiting for card" })).toBeVisible();
  for (const name of ["Leave pending", "Cancel payment"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(box.y + box.height).toBeLessThanOrEqual(667);
  }
  await page.screenshot({ path: "test-results/terminal-mobile.png" });
});

test("a different saved total cannot silently replace the current checkout", async ({ page }) => {
  let starts = 0;
  await mount(page, "checkout", async path => {
    if (path.endsWith("/checkout")) return { booking: { bookingId: 10, bookingNumber: "BK-OLD", totalAmount: 15.4, balanceDue: 15.4, status: "confirmed" }, pendingPayment: null };
    if (path.endsWith("/start") || path.endsWith("/bookings")) starts++;
  });
  await page.getByRole("button", { name: /Complete The Order/i }).click();
  await expect(page.getByRole("alertdialog", { name: "Different saved order" })).toBeVisible();
  await expect(page.getByText(/Saved order BK-OLD/)).toBeVisible();
  await page.screenshot({ path: "test-results/checkout-mismatch.png" });
  expect(starts).toBe(0);
  await page.getByRole("button", { name: "Start separate sale" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(starts).toBe(0);
});

test("changing products at the same total requires explicit separate checkout", async ({ page }) => {
  let starts = 0;
  await mount(page, "checkout&changed=1", async path => {
    if (path.endsWith("/checkout")) return { booking: { bookingId: 10, bookingNumber: "BK-SAME-PRICE", totalAmount: 550, balanceDue: 550, status: "confirmed" }, pendingPayment: null };
    if (path.endsWith("/start") || path.endsWith("/bookings")) starts++;
  });
  await page.getByRole("button", { name: /Complete The Order/i }).click();
  await expect(page.getByRole("alertdialog", { name: "Different saved order" })).toBeVisible();
  expect(starts).toBe(0);
});
