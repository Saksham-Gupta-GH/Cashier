import test from "node:test";
import assert from "node:assert/strict";
import reducer, { setCartItems, ensureCheckoutKey, rotateCheckoutKey, checkoutCartSignature } from "./cartSlice.js";

test("checkout identity is stable for retries and flags even same-price item changes", () => {
  let state = reducer(undefined, setCartItems([{ id: 1, price: 10 }]));
  state = reducer(state, ensureCheckoutKey());
  const key = state.checkoutKey;
  assert.equal(state.checkoutSnapshot, checkoutCartSignature(state));
  state = reducer(state, ensureCheckoutKey());
  assert.equal(state.checkoutKey, key);
  state = reducer(state, setCartItems([{ id: 2, price: 10 }]));
  state = reducer(state, ensureCheckoutKey());
  assert.equal(state.checkoutKey, key);
  assert.notEqual(state.checkoutSnapshot, checkoutCartSignature(state));
  state = reducer(state, rotateCheckoutKey());
  state = reducer(state, ensureCheckoutKey());
  assert.notEqual(state.checkoutKey, key);
  assert.equal(state.checkoutSnapshot, checkoutCartSignature(state));
});
