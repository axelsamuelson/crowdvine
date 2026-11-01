/**
 * Exit-discount feature flags and tunables.
 * EXIT_DISCOUNT_ENABLED defaults OFF (including production).
 *
 * Stacking note (cart.cost):
 * Member (Privilege) and pallet early-bird discounts are already baked into
 * CartService line totals / cart.cost.totalAmount before checkout. Exit codes
 * therefore cannot “stack on top” of those prices — checkout rejects the exit
 * code when any cart line already carries a member/early-bird discount.
 */

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

/** Server + client: feature must be explicitly enabled. */
export function isExitDiscountEnabled(): boolean {
  return (
    parseBool(process.env.EXIT_DISCOUNT_ENABLED, false) ||
    parseBool(process.env.NEXT_PUBLIC_EXIT_DISCOUNT_ENABLED, false)
  );
}

/** Code validity window in days (default 14). */
export function exitDiscountValidityDays(): number {
  return parsePositiveInt(process.env.EXIT_DISCOUNT_VALIDITY_DAYS, 14);
}

/** Retention for unused codes + email (default 12 months). */
export function exitDiscountRetentionMonths(): number {
  return parsePositiveInt(process.env.EXIT_DISCOUNT_RETENTION_MONTHS, 12);
}

export type ExitDiscountScope = "pallet_only" | "all";

/**
 * Fulfilment scope for exit codes.
 * Default **all** (Axel 2026-10): applies to pallet and direct-box orders.
 * Set EXIT_DISCOUNT_SCOPE=pallet_only only if product later restricts to shared pallets.
 */
export function exitDiscountScope(): ExitDiscountScope {
  const raw = (process.env.EXIT_DISCOUNT_SCOPE || "").trim().toLowerCase();
  if (raw === "pallet_only") return "pallet_only";
  return "all";
}

/**
 * Extra wine_box ids to exclude from the exit-discount base (CSV UUIDs),
 * in addition to wine_boxes.exclude_from_exit_discount = true.
 */
export function exitDiscountExcludedWineBoxIdsFromEnv(): string[] {
  const raw = process.env.EXIT_DISCOUNT_EXCLUDED_WINE_BOX_IDS || "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[0-9a-f-]{36}$/.test(s));
}

/**
 * Email delivery for minted codes:
 * - live: send via Resend (default)
 * - log: do not call Resend; log payload (preview / agent tests)
 * - off: skip send entirely (still mint code)
 */
export type ExitDiscountEmailMode = "live" | "log" | "off";

export function exitDiscountEmailMode(): ExitDiscountEmailMode {
  const raw = (process.env.EXIT_DISCOUNT_EMAIL_MODE || "").trim().toLowerCase();
  if (raw === "log" || raw === "off") return raw;
  return "live";
}

export const EXIT_DISCOUNT_PERCENT = 10;
export const EXIT_DISCOUNT_SHOWN_KEY = "pact_exit_discount_shown";
export const NEWSLETTER_CONSENT_TEXT_VERSION = "exit_popup_v1_2026-10";
