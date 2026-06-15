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

/** Browser fetch failures when Supabase auth is unreachable (offline, paused project). */
export function isAuthNetworkError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const msg = error.message || "";
  return (
    msg === "Failed to fetch" ||
    msg === "Load failed" ||
    /networkerror|failed to fetch/i.test(msg)
  );
}
