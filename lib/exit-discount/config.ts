/**
 * Exit-discount feature flags and tunables.
 * EXIT_DISCOUNT_ENABLED defaults OFF (including production).
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

export const EXIT_DISCOUNT_PERCENT = 10;
export const EXIT_DISCOUNT_SHOWN_KEY = "pact_exit_discount_shown";
export const NEWSLETTER_CONSENT_TEXT_VERSION = "exit_popup_v1_2026-10";
