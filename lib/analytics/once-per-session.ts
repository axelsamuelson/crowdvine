/** sessionStorage guards so mount/Strict Mode remounts don't double-fire analytics. */

export const CHECKOUT_STARTED_KEY = "pact_checkout_started";
export const SIGNUP_STARTED_CHECKOUT_KEY = "pact_signup_started_checkout";
export const SIGNUP_COMPLETED_PREFIX = "pact_signup_completed_";

export function claimOnce(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export function clearClaim(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function claimSignupCompletedOnce(userId: string): boolean {
  return claimOnce(`${SIGNUP_COMPLETED_PREFIX}${userId}`);
}
