const DAY_MS = 24 * 60 * 60 * 1000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

/**
 * Optional absolute cap from created_at.
 * Empty / "null" / "unlimited" / "0" → unlimited (null).
 * Positive integer → hard-expire after that many days without asking.
 */
function envOptionalMaxAgeDays(name: string): number | null {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return null;
  if (raw === "null" || raw === "unlimited" || raw === "none" || raw === "0") {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return fallback;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return fallback;
}

/**
 * Extension / expiry automation knobs (Axel 2026-10-30):
 * ask every N days; reply window; optional absolute cap (default unlimited).
 */
export function getReservationExpiryConfig() {
  const maxAgeDays = envOptionalMaxAgeDays("RESERVATION_MAX_AGE_DAYS");
  const extensionDays = envInt("RESERVATION_EXTENSION_DAYS", 30);
  const replyDays = envInt("RESERVATION_EXTENSION_REPLY_DAYS", 7);

  return {
    /**
     * Absolute lifetime from created_at, or null for unlimited extensions.
     * Default: unlimited. Set RESERVATION_MAX_AGE_DAYS=90 to hard-stop.
     */
    maxAgeDays,
    /** Ask interval (days) while the pallet has not filled / confirmed. */
    extensionDays,
    /** How long the customer has to confirm an extension ask. */
    replyDays,
    /**
     * Master switch. Default OFF until Axel enables after dry-run review.
     * When false the cron authenticates but does not process.
     */
    enabled: envBool("RESERVATION_EXPIRY_ENABLED", false),
    /**
     * When true (and enabled), only log intended actions — no DB writes,
     * Stripe changes, or emails.
     */
    dryRun: envBool("RESERVATION_EXPIRY_DRY_RUN", true),
    /**
     * Customer emails require explicit approval (Axel). Default OFF.
     * Dry-run never sends even when this is true.
     */
    sendEmail: envBool("RESERVATION_EXPIRY_SEND_EMAIL", false),
  } as const;
}

export type ReservationExpiryConfig = ReturnType<
  typeof getReservationExpiryConfig
>;

export const RESERVATION_EXPIRY_ARCHIVE_REASONS = {
  noExtension: "terms_s3_extension_not_confirmed",
  maxAge: "terms_s3_max_age",
} as const;

export const RESERVATION_EXPIRY_ADMIN_FLAGS = {
  alreadyCharged: "already_charged",
} as const;

export const RESERVATION_EXPIRY_EMAIL_TYPES = {
  extensionAsk: "reservation_extension_ask",
  cancelledNoReply: "reservation_expiry_cancelled",
  cancelledMaxAge: "reservation_expiry_max_age",
} as const;

/**
 * From for expiry/extension mail. Domain pactwines.com is verified in Resend;
 * same customer@ mailbox as Reply-To / contact elsewhere in the app.
 */
export function reservationExpiryFrom(): string {
  return (
    process.env.RESERVATION_EXPIRY_FROM?.trim() ||
    "PACT <customer@pactwines.com>"
  );
}

/** Reply-To for expiry/extension mail (monitored inbox). */
export function reservationExpiryReplyTo(): string {
  return (
    process.env.RESERVATION_EXPIRY_REPLY_TO?.trim() ||
    process.env.RESEND_REPLY_TO?.trim() ||
    "customer@pactwines.com"
  );
}

export { DAY_MS };
