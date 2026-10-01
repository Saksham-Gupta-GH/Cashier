const SESSION_END_CODES = new Set([
  "application_boundary_mismatch",
  "authentication_required",
  "credentials_changed",
  "invalid_token",
  "session_revoked",
  "token_expired",
]);

export function shouldEndCashierSession(result) {
  if (Number(result?.error?.status) !== 401) return false;
  const code = String(result?.error?.data?.code || "").trim().toLowerCase();
  return SESSION_END_CODES.has(code);
}
