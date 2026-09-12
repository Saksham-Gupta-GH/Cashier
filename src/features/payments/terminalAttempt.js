export function terminalOutcome(result) {
  const status = result?.transaction?.status || result?.data?.status || result?.status;
  if (status === "captured") return "approved";
  if (status === "cancelled" || status === "voided") return "cancelled";
  if (status === "failed") return "declined";
  if (status === "refunded" || status === "partially_refunded") return "review";
  return "waiting";
}

export function attemptStorageKey({ locationId, sourceType, sourceId }) {
  return `cashier:terminal-attempt:${locationId}:${sourceType}:${sourceId}`;
}

export function readAttempt(storage, key) {
  const value = storage.getItem(key);
  if (!value) return null;
  const parsed = JSON.parse(value);
  if (!parsed?.request?.idempotencyKey) throw new Error("Saved payment needs review before retrying.");
  return parsed;
}
