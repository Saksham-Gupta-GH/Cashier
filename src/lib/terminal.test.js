import test from "node:test";
import assert from "node:assert/strict";

import { clearTerminal, getTerminal, setTerminal } from "./terminal.js";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("paired terminal storage retains and clears the secure pairing token", () => {
  globalThis.localStorage = createStorage();

  setTerminal({
    deviceId: 42,
    locationId: 5,
    pairingToken: "signed-device-credential",
  });

  assert.deepEqual(getTerminal(), {
    deviceId: 42,
    locationId: 5,
    pairingToken: "signed-device-credential",
  });

  clearTerminal();
  assert.equal(getTerminal(), null);
});
