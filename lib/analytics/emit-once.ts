/**
 * Emit-once guards for checkout analytics.
 * sessionStorage survives remounts (Strict Mode, magic-link return);
 * in-memory Set catches two calls in the same tick before storage writes settle.
 */

const memoryClaims = new Set<string>();

export const CHECKOUT_SESSION_ID_KEY = "pact_checkout_session_id";
export const CHECKOUT_STARTED_KEY = "pact_checkout_started";
export const SIGNUP_STARTED_CHECKOUT_KEY = "pact_signup_started_checkout";
export const SIGNUP_COMPLETED_PREFIX = "pact_signup_completed_";

function ageShownKey(sessionId: string, countryCode: string): string {
  return `age_shown:${sessionId}:${countryCode.toUpperCase()}`;
}

function agePassedKey(sessionId: string, countryCode: string): string {
  return `age_passed:${sessionId}:${countryCode.toUpperCase()}`;
}

function termsAcceptedKey(sessionId: string): string {
  return `terms_accepted:${sessionId}`;
}

/** Claim the key. Returns true only for the first successful claim. */
export function claimOnce(key: string): boolean {
  if (typeof window === "undefined") return false;
  if (memoryClaims.has(key)) return false;
  try {
    if (sessionStorage.getItem(key)) {
      memoryClaims.add(key);
      return false;
    }
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage unavailable — memory Set still dedupes this tab tick
  }
  memoryClaims.add(key);
  return true;
}

/**
 * Run `fn` at most once per key (sessionStorage + memory).
 * Returns true if `fn` ran.
 */
export function emitOnce(key: string, fn: () => void): boolean {
  if (!claimOnce(key)) return false;
  fn();
  return true;
}

export function clearClaim(key: string): void {
  memoryClaims.delete(key);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearClaimsWithPrefix(prefix: string): void {
  for (const k of [...memoryClaims]) {
    if (k.startsWith(prefix)) memoryClaims.delete(k);
  }
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) sessionStorage.removeItem(k);
  } catch {
    // ignore
  }
}

/** Stable id for one checkout attempt; survives magic-link round trips. */
export function getCheckoutSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(CHECKOUT_SESSION_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(CHECKOUT_SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "fallback";
  }
}

export function peekCheckoutSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CHECKOUT_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function ageVerificationShownKey(countryCode: string): string {
  return ageShownKey(getCheckoutSessionId(), countryCode);
}

export function ageVerificationPassedKey(countryCode: string): string {
  return agePassedKey(getCheckoutSessionId(), countryCode);
}

export function termsAcceptedEmitKey(): string {
  return termsAcceptedKey(getCheckoutSessionId());
}

/**
 * Clear checkout analytics guards after a successful reservation so a
 * second purchase in the same browser session can emit again.
 */
export function clearCheckoutAnalyticsSession(): void {
  const sessionId = peekCheckoutSessionId();
  clearClaim(CHECKOUT_STARTED_KEY);
  clearClaim(SIGNUP_STARTED_CHECKOUT_KEY);
  if (sessionId) {
    clearClaim(termsAcceptedKey(sessionId));
    clearClaimsWithPrefix(`age_shown:${sessionId}:`);
    clearClaimsWithPrefix(`age_passed:${sessionId}:`);
  }
  clearClaim(CHECKOUT_SESSION_ID_KEY);
}

export function claimSignupCompletedOnce(userId: string): boolean {
  return claimOnce(`${SIGNUP_COMPLETED_PREFIX}${userId}`);
}

/** Test-only: wipe memory + storage claims. */
export function resetEmitOnceForTests(): void {
  memoryClaims.clear();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
}
