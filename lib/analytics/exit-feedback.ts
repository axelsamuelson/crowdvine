/**
 * Exit-intent / abandoned-cart feedback helpers.
 * sessionStorage only (session_id + shown flag). No new cookies or localStorage keys.
 */

import { CHECKOUT_STARTED_KEY } from "@/lib/analytics/emit-once";
import { isInternalDevice } from "@/lib/analytics/internal-device";

export const EXIT_FEEDBACK_SESSION_ID_KEY = "pact_exit_feedback_session_id";
export const EXIT_FEEDBACK_SHOWN_KEY = "pact_exit_feedback_shown";

export const EXIT_FEEDBACK_ANSWER_MAX = 1000;
export const EXIT_FEEDBACK_PAGE_MAX = 500;
export const EXIT_FEEDBACK_SESSION_ID_MAX = 128;

export type ExitFeedbackStep = "checkout" | "cart";

export function getExitFeedbackSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(EXIT_FEEDBACK_SESSION_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `ef_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(EXIT_FEEDBACK_SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function hasShownExitFeedback(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(EXIT_FEEDBACK_SHOWN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markExitFeedbackShown(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EXIT_FEEDBACK_SHOWN_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasCheckoutStartedInSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CHECKOUT_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Resolve funnel step for the prompt. Checkout takes priority over cart.
 */
export function resolveExitFeedbackStep(opts: {
  checkoutStarted: boolean;
  cartHasItems: boolean;
}): ExitFeedbackStep | null {
  if (opts.checkoutStarted) return "checkout";
  if (opts.cartHasItems) return "cart";
  return null;
}

/** Pathname only — strip query/hash so emails or tokens never land in `page`. */
export function sanitizeExitFeedbackPage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "/";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).pathname.slice(0, EXIT_FEEDBACK_PAGE_MAX) || "/";
    }
  } catch {
    // fall through
  }
  const path = trimmed.split(/[?#]/)[0] || "/";
  return path.slice(0, EXIT_FEEDBACK_PAGE_MAX) || "/";
}

/**
 * Internal/test session detection — reuses analytics internal-device flag and
 * common local/preview signals (no new storage writes).
 */
export function isInternalExitFeedbackSession(
  opts?: {
    hostname?: string;
    search?: string;
    isInternalDeviceFn?: () => boolean;
  },
): boolean {
  const checkDevice = opts?.isInternalDeviceFn ?? isInternalDevice;
  if (checkDevice()) return true;

  const hostname =
    opts?.hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    host.includes("vercel.app")
  ) {
    return true;
  }

  const search =
    opts?.search ??
    (typeof window !== "undefined" ? window.location.search : "");
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search : `?${search}`,
    );
    if (params.has("internal")) return true;
  } catch {
    // ignore
  }

  return false;
}

export function normalizeExitFeedbackAnswer(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const answer = raw.trim();
  if (!answer) return null;
  if (answer.length > EXIT_FEEDBACK_ANSWER_MAX) return null;
  return answer;
}
