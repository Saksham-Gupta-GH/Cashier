import test from "node:test";
import assert from "node:assert/strict";
import { attemptStorageKey, readAttempt, terminalOutcome } from "./terminalAttempt.js";

test("unknown and pending results never mean cancelled", () => {
  for (const value of [undefined, {}, { status: "pending" }, { status: "processing" }, { reviewRequired: true }]) {
    assert.equal(terminalOutcome(value), "waiting");
  }
  assert.equal(terminalOutcome({ status: "captured" }), "approved");
  assert.equal(terminalOutcome({ status: "cancelled" }), "cancelled");
  assert.equal(terminalOutcome({ status: "failed" }), "declined");
  assert.equal(terminalOutcome({ status: "refunded" }), "review");
});

test("payment identity survives reopening and is isolated by location and order", () => {
  const saved = { request: { idempotencyKey: "attempt-one", amount: 550 }, transactionId: 123 };
  assert.deepEqual(readAttempt({ getItem: () => JSON.stringify(saved) }, "key"), saved);
  assert.notEqual(attemptStorageKey({ locationId: 1, sourceType: "booking", sourceId: 1 }), attemptStorageKey({ locationId: 2, sourceType: "booking", sourceId: 1 }));
  assert.throws(() => readAttempt({ getItem: () => "{}" }, "key"), /review/);
});
