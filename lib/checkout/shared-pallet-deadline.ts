/**
 * Shared-pallet charge deadline (customer-facing data contract).
 *
 * The customer is charged only when the pallet reaches min_bottles_to_complete.
 * A date never triggers a charge. If the pallet is not full by the deadline,
 * nothing is charged.
 *
 * The deadline is counted from the purchase (reservation created_at + 28 days),
 * not from the pallet's created_at. There is no stored closes_at.
 */

/** Max window after the purchase (inclusive calendar contract: 28 days). */
export const SHARED_PALLET_MAX_OPEN_DAYS = 28;

export const SHARED_PALLET_MAX_OPEN_MS =
  SHARED_PALLET_MAX_OPEN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Anchor + 28 days. Returns null when the anchor is missing or invalid.
 * Prefer `computeReservationChargeDeadlineIso` for a customer purchase.
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

/**
 * Per-customer charge deadline: reservation created_at + 28 days.
 * Does not charge anything; callers must still require a full pallet.
 */
export function computeReservationChargeDeadlineIso(
  reservationCreatedAt: string | Date | null | undefined,
): string | null {
  return computeSharedPalletChargeDeadlineIso(reservationCreatedAt);
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
