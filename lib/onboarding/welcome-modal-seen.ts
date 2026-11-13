/**
 * Persist welcome-modal "seen" per user.
 * Primary: profiles.onboarding_seen via /api/user/onboarding-seen.
 * Fallback: localStorage keyed by user id (no migration).
 */

export const WELCOME_SEEN_STORAGE_PREFIX = "pact_welcome_seen:";

export function welcomeSeenStorageKey(userId: string): string {
  return `${WELCOME_SEEN_STORAGE_PREFIX}${userId}`;
}

export function readWelcomeSeenLocal(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(welcomeSeenStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeWelcomeSeenLocal(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(welcomeSeenStorageKey(userId), "1");
  } catch {
    // ignore quota / private mode
  }
}

export async function fetchWelcomeSeen(): Promise<{
  ok: boolean;
  unauthorized: boolean;
  onboardingSeen: boolean;
}> {
  try {
    const response = await fetch("/api/user/onboarding-seen", {
      credentials: "same-origin",
    });
    if (response.status === 401) {
      return { ok: false, unauthorized: true, onboardingSeen: false };
    }
    if (!response.ok) {
      return { ok: false, unauthorized: false, onboardingSeen: false };
    }
    const data = (await response.json()) as { onboardingSeen?: boolean };
    return {
      ok: true,
      unauthorized: false,
      onboardingSeen: Boolean(data.onboardingSeen),
    };
  } catch {
    return { ok: false, unauthorized: false, onboardingSeen: false };
  }
}

export async function markWelcomeSeenRemote(): Promise<boolean> {
  try {
    const response = await fetch("/api/user/onboarding-seen", {
      method: "POST",
      credentials: "same-origin",
    });
    return response.ok;
  } catch {
    return false;
  }
}
