/**
 * Shared-pallet open window / charge deadline (customer-facing data contract).
 *
 * Product rule: pallet may stay open at most 4 weeks from open/creation.
 * Charge happens when the pallet fills OR the last date is reached — whichever
 * first. There is no stored closes_at today; open anchor is pallets.created_at.
 *
 * Close-time flow (customer wait / cancel / switch-to-direct) is a follow-up;
 * this module only computes the displayed “senast {datum}”.
 */

/** Max open window after pallet creation (inclusive calendar contract: 28 days). */
export const SHARED_PALLET_MAX_OPEN_DAYS = 28;

export const SHARED_PALLET_MAX_OPEN_MS =
  SHARED_PALLET_MAX_OPEN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Charge / close deadline = created_at + 4 weeks.
 * Returns null when created_at is missing/invalid (fail closed for copy).
 */
export function computeSharedPalletChargeDeadlineIso(
  createdAt: string | Date | null | undefined,
): string | null {
  if (createdAt == null) return null;
  const openMs =
    createdAt instanceof Date ? createdAt.getTime() : Date.parse(String(createdAt));
  if (!Number.isFinite(openMs)) return null;
  return new Date(openMs + SHARED_PALLET_MAX_OPEN_MS).toISOString();
}

/** Format deadline for checkout CTA (Swedish / English locale). */
export function formatSharedPalletChargeDeadline(
  iso: string | null | undefined,
  locale: "sv" | "en",
): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(ms));
}
