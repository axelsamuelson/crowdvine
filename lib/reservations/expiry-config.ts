const DAY_MS = 24 * 60 * 60 * 1000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
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
 * Status-email automation knobs (Axel 2026-11-10):
 * Orders stay until the customer cancels or the pallet closes.
 * No confirmation/extension step and no auto-cancellation for no reply.
 * Status email every N days (default 28 = 4 weeks) while the pallet is open.
 */
export function getReservationExpiryConfig() {
  const statusIntervalDays = envInt("RESERVATION_STATUS_EMAIL_DAYS", 28);

  return {
    /**
     * Cadence for the no-action-required pallet status email (days).
     * Default 28 (4 weeks). Legacy env RESERVATION_EXTENSION_DAYS is ignored
     * for cancellation; status cadence uses this knob only.
     */
    statusIntervalDays,
    /**
     * @deprecated Kept for callers/tests that still read the old name.
     * Same value as statusIntervalDays.
     */
    extensionDays: statusIntervalDays,
    /**
     * @deprecated Reply window removed — orders are never auto-cancelled.
     */
    replyDays: envInt("RESERVATION_EXTENSION_REPLY_DAYS", 7),
    /**
     * Absolute lifetime removed (Axel 2026-11-10). Always null.
     * Env RESERVATION_MAX_AGE_DAYS is ignored so open orders are never
     * hard-expired by this job.
     */
    maxAgeDays: null as number | null,
    /**
     * Master switch. Default ON.
     * Set RESERVATION_EXPIRY_ENABLED=false to pause without a deploy.
     */
    enabled: envBool("RESERVATION_EXPIRY_ENABLED", true),
    /**
     * When true (and enabled), only log intended actions — no DB writes,
     * Stripe changes, or emails. Default OFF (live). Set true to dry-run.
     */
    dryRun: envBool("RESERVATION_EXPIRY_DRY_RUN", false),
    /**
     * Customer emails. Default ON.
     * Dry-run never sends even when this is true.
     * Set RESERVATION_EXPIRY_SEND_EMAIL=false to keep mutations without mail.
     */
    sendEmail: envBool("RESERVATION_EXPIRY_SEND_EMAIL", true),
  } as const;
}

export type ReservationExpiryConfig = ReturnType<
  typeof getReservationExpiryConfig
>;

/** @deprecated Auto-cancel archive reasons — no longer used by the expiry job. */
export const RESERVATION_EXPIRY_ARCHIVE_REASONS = {
  noExtension: "terms_s3_extension_not_confirmed",
  maxAge: "terms_s3_max_age",
} as const;

export const RESERVATION_EXPIRY_ADMIN_FLAGS = {
  alreadyCharged: "already_charged",
} as const;

export const RESERVATION_EXPIRY_EMAIL_TYPES = {
  /** Prefix; full type is `pallet_status_update_${periodDay}` for idempotency. */
  statusUpdate: "pallet_status_update",
  /** @deprecated */
  extensionAsk: "reservation_extension_ask",
  /** @deprecated */
  cancelledNoReply: "reservation_expiry_cancelled",
  /** @deprecated */
  cancelledMaxAge: "reservation_expiry_max_age",
} as const;

export function statusUpdateEmailType(periodDay: number): string {
  return `${RESERVATION_EXPIRY_EMAIL_TYPES.statusUpdate}_${periodDay}`;
}

/**
 * Legal-required From for pallet status / order mail only.
 * Hard-coded — do not fall back to RESEND_FROM / noreply (other mail keeps those).
 */
export const RESERVATION_EXPIRY_FROM_HARDCODED =
  "PACT <customer@pactwines.com>" as const;

/** Legal-required Reply-To for the same emails. */
export const RESERVATION_EXPIRY_REPLY_TO_HARDCODED =
  "customer@pactwines.com" as const;

export function reservationExpiryFrom(): string {
  return RESERVATION_EXPIRY_FROM_HARDCODED;
}

export function reservationExpiryReplyTo(): string {
  return RESERVATION_EXPIRY_REPLY_TO_HARDCODED;
}

export { DAY_MS };
