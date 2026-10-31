/**
 * Exit-intent / abandoned-cart feedback helpers.
 * Persistence is localStorage only (answered + dismiss-until). No sessionStorage.
 */

import { CHECKOUT_STARTED_KEY } from "@/lib/analytics/emit-once";
import { isInternalDevice } from "@/lib/analytics/internal-device";

/** Anonymous analytics id for the feedback POST (localStorage). */
export const EXIT_FEEDBACK_SESSION_ID_KEY = "pact_exit_feedback_session_id";
/** Permanent local flag after a submitted answer. */
export const EXIT_FEEDBACK_ANSWERED_KEY = "pact_exit_feedback_answered";
/** ISO timestamp: do not show again until this time (soft dismiss). */
export const EXIT_FEEDBACK_DISMISS_UNTIL_KEY =
  "pact_exit_feedback_dismiss_until";

/** @deprecated Removed — shown flag used sessionStorage; keep export for test migration. */
export const EXIT_FEEDBACK_SHOWN_KEY = "pact_exit_feedback_shown";

export const EXIT_FEEDBACK_ANSWER_MAX = 1000;
export const EXIT_FEEDBACK_PAGE_MAX = 500;
export const EXIT_FEEDBACK_SESSION_ID_MAX = 128;
export const EXIT_FEEDBACK_DISMISS_DAYS = 30;
/** Minimum visible/active time on the site before desktop exit-intent may fire. */
export const EXIT_FEEDBACK_MIN_ACTIVE_MS = 25_000;

export type ExitFeedbackStep = "checkout" | "cart";

export const EXIT_FEEDBACK_REASONS = [
  "min_6_bottles",
  "price",
  "delivery_unclear",
  "wait_too_long",
  "just_browsing",
  "other",
] as const;

export type ExitFeedbackReason = (typeof EXIT_FEEDBACK_REASONS)[number];

export const EXIT_FEEDBACK_REASON_OPTIONS: ReadonlyArray<{
  value: ExitFeedbackReason;
  label: string;
}> = [
  { value: "min_6_bottles", label: "Minst 6 flaskor är för många" },
  { value: "price", label: "Priset" },
  {
    value: "delivery_unclear",
    label: "Osäker på hur leverans/pallen fungerar",
  },
  { value: "wait_too_long", label: "För lång väntan på leverans" },
  { value: "just_browsing", label: "Ville bara titta" },
  { value: "other", label: "Annat" },
];

export function isExitFeedbackReason(
  value: unknown,
): value is ExitFeedbackReason {
  return (
    typeof value === "string" &&
    (EXIT_FEEDBACK_REASONS as readonly string[]).includes(value)
  );
}

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getExitFeedbackSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(EXIT_FEEDBACK_SESSION_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `ef_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(EXIT_FEEDBACK_SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function hasAnsweredExitFeedback(): boolean {
  return readLocal(EXIT_FEEDBACK_ANSWERED_KEY) === "1";
}

export function markExitFeedbackAnswered(): void {
  writeLocal(EXIT_FEEDBACK_ANSWERED_KEY, "1");
  // Clear soft-dismiss so answered wins permanently.
  try {
    localStorage.removeItem(EXIT_FEEDBACK_DISMISS_UNTIL_KEY);
  } catch {
    // ignore
  }
}

export function getExitFeedbackDismissUntilMs(): number | null {
  const raw = readLocal(EXIT_FEEDBACK_DISMISS_UNTIL_KEY);
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

export function isExitFeedbackDismissActive(nowMs: number = Date.now()): boolean {
  const until = getExitFeedbackDismissUntilMs();
  return until != null && nowMs < until;
}

export function markExitFeedbackDismissed(
  nowMs: number = Date.now(),
  days: number = EXIT_FEEDBACK_DISMISS_DAYS,
): void {
  if (hasAnsweredExitFeedback()) return;
  const until = new Date(nowMs + Math.max(1, days) * 24 * 60 * 60 * 1000);
  writeLocal(EXIT_FEEDBACK_DISMISS_UNTIL_KEY, until.toISOString());
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

/**
 * Never show on admin, cart, checkout, or payment (incl. subpaths).
 * Optional `/en` locale prefix is stripped first.
 */
export function isExitFeedbackBlockedPath(pathname: string): boolean {
  const raw = (pathname || "/").split(/[?#]/)[0] || "/";
  const p = raw.replace(/^\/en(?=\/|$)/, "") || "/";
  const prefixes = ["/admin", "/cart", "/checkout", "/payment"] as const;
  for (const prefix of prefixes) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return true;
  }
  return false;
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

function parsePublicBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

export function treatVercelAppAsInternalExitHost(): boolean {
  return parsePublicBool(
    process.env.NEXT_PUBLIC_EXIT_FEEDBACK_SUPPRESS_ON_VERCEL_APP,
    true,
  );
}

/** Preview/agent override: `?exit_test=1` bypasses internal-host suppress only. */
export function hasExitFeedbackTestOverride(search?: string): boolean {
  const raw =
    search ??
    (typeof window !== "undefined" ? window.location.search : "");
  try {
    const params = new URLSearchParams(
      raw.startsWith("?") ? raw : `?${raw}`,
    );
    const v = params.get("exit_test");
    return v === "1" || v === "true" || v === "yes";
  } catch {
    return false;
  }
}

export function isInternalExitFeedbackSession(opts?: {
  hostname?: string;
  search?: string;
  isInternalDeviceFn?: () => boolean;
  treatVercelAppAsInternal?: boolean;
}): boolean {
  const checkDevice = opts?.isInternalDeviceFn ?? isInternalDevice;
  if (checkDevice()) return true;

  const hostname =
    opts?.hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  const vercelAsInternal =
    opts?.treatVercelAppAsInternal ?? treatVercelAppAsInternalExitHost();
  if (vercelAsInternal && host.includes("vercel.app")) {
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

export type ExitFeedbackSuppressOpts = {
  hostname?: string;
  search?: string;
  pathname?: string;
  isInternalDeviceFn?: () => boolean;
  treatVercelAppAsInternal?: boolean;
  /** Platform admin (session or profile) — always suppress. */
  isAdmin?: boolean;
  /** Dirty Wine / B2B host — always suppress until product says otherwise. */
  isB2B?: boolean;
  /** Logged-in profile already answered. */
  profileAnswered?: boolean;
  /** When true, skip answered/dismiss localStorage checks (tests). */
  ignoreLocalPersistence?: boolean;
};

/**
 * Hard suppress gates for the exit popup.
 * Admin / B2B / blocked paths always win.
 * Internal hosts are suppressed unless `?exit_test=1`.
 * Answered (local or profile) and soft-dismiss always suppress (even with exit_test).
 */
export function shouldSuppressExitFeedbackUi(
  opts?: ExitFeedbackSuppressOpts,
): boolean {
  if (opts?.isAdmin === true) return true;
  if (opts?.isB2B === true) return true;

  const pathname =
    opts?.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  if (pathname && isExitFeedbackBlockedPath(pathname)) return true;

  if (opts?.profileAnswered === true) return true;

  if (!opts?.ignoreLocalPersistence) {
    if (hasAnsweredExitFeedback()) return true;
    if (isExitFeedbackDismissActive()) return true;
  }

  if (hasExitFeedbackTestOverride(opts?.search)) return false;
  return isInternalExitFeedbackSession(opts);
}

/**
 * Desktop exit-intent may fire only after this much active (visible) time.
 */
export function hasMetExitFeedbackActiveTime(
  activeMs: number,
  minMs: number = EXIT_FEEDBACK_MIN_ACTIVE_MS,
): boolean {
  return activeMs >= minMs;
}

export function normalizeExitFeedbackAnswer(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const answer = raw.trim();
  if (!answer) return null;
  if (answer.length > EXIT_FEEDBACK_ANSWER_MAX) return null;
  return answer;
}
