/**
 * Client helpers for open-platform guest ensure-session (checkout Steg 4).
 *
 * Camille (prod 22/11): first visit hung on "Förbereder betalning…" because the
 * ensure-session effect cleaned up mid-flight (deps / Strict Mode), left
 * `guestEnsureAttemptedRef` set, ignored the successful response (`if (cancelled)
 * return` before setSession), and never showed an error — so no Stripe, no
 * "Försök igen". Reload worked via proof remint.
 */

/** Max wait for /api/checkout/ensure-session before surfacing retry UI. */
export const GUEST_ENSURE_SESSION_TIMEOUT_MS = 15_000;

export type GuestEnsureSessionResponseData = {
  ok?: boolean;
  alreadyAuthenticated?: boolean;
  autoSignedIn?: boolean;
  requiresLogin?: boolean;
  session?: { access_token: string; refresh_token: string };
  error?: string;
} | null;

export type GuestEnsureSessionOutcome =
  | { kind: "requires_login" }
  | { kind: "already_authenticated" }
  | {
      kind: "apply_session";
      access_token: string;
      refresh_token: string;
    }
  | { kind: "error"; message: string | null }
  | { kind: "ignore" };

/**
 * Decide what to do with an ensure-session HTTP result.
 *
 * Successful session tokens are applied even when `cancelled` is true so a
 * raced effect cleanup cannot drop setSession (first-visit hang).
 */
export function resolveGuestEnsureSessionOutcome(args: {
  cancelled: boolean;
  status: number;
  data: GuestEnsureSessionResponseData;
}): GuestEnsureSessionOutcome {
  const { cancelled, status, data } = args;
  const tokens =
    data?.autoSignedIn &&
    data.session?.access_token &&
    data.session?.refresh_token
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null;

  if (status === 409 || data?.requiresLogin) {
    if (cancelled) return { kind: "ignore" };
    return { kind: "requires_login" };
  }

  if (data?.alreadyAuthenticated) {
    // Still mark auth ready even if the effect cleaned up.
    return { kind: "already_authenticated" };
  }

  if (tokens) {
    return {
      kind: "apply_session",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  if (cancelled) return { kind: "ignore" };
  return {
    kind: "error",
    message: data?.error?.trim() || null,
  };
}

/** Whether cleanup should clear the one-shot attempted email so a remount can retry. */
export function shouldClearGuestEnsureAttemptOnCleanup(
  sessionApplied: boolean,
): boolean {
  return !sessionApplied;
}
