/** Supabase refresh-token rotation errors (concurrent refresh, stale cookie). */
export function isStaleRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  return (
    code === "refresh_token_already_used" ||
    /invalid refresh token/i.test(msg) ||
    (/refresh token/i.test(msg) && /already used/i.test(msg))
  );
}
