import test from "node:test";
import assert from "node:assert/strict";
import { shouldEndCashierSession } from "./authFailurePolicy.js";

test("invalid Cashier credentials end the persisted session", () => {
  for (const code of [
    "invalid_token",
    "token_expired",
    "session_revoked",
    "application_boundary_mismatch",
    "credentials_changed",
  ]) {
    assert.equal(
      shouldEndCashierSession({ error: { status: 401, data: { code } } }),
      true
    );
  }
});

test("business 401 responses such as an incorrect manager PIN keep the cashier signed in", () => {
  assert.equal(
    shouldEndCashierSession({ error: { status: 401, data: { error: "Invalid manager PIN" } } }),
    false
  );
  assert.equal(
    shouldEndCashierSession({ error: { status: 403, data: { code: "invalid_token" } } }),
    false
  );
});
