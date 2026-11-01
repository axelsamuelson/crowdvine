/**
 * Dirty Wine (B2B) line quantity helpers.
 *
 * Restaurants may order any integer quantity ≥ 1 — there is no 6-pack minimum
 * and quantities are not forced to multiples of 6.
 *
 * Cart validation for B2B lives in `lib/cart/cart-minimum.ts`
 * (`computeB2BPackMinimum` / channel `"b2b"`). B2C (pactwines.com) uses a
 * separate cart-total floor of 6 bottles across any mix — do not reuse this
 * module for PACT minima.
 */

/** @deprecated Pack size is no longer enforced on dirtywine; kept for legacy references. */
export const BOTTLE_PACK_SIZE = 6;

/** Max bottles selectable / storable on a B2B line. */
export const B2B_MAX_PACK_BOTTLES = 96;

/** Minimum bottles per B2B line (single bottles allowed). */
export const B2B_MIN_LINE_BOTTLES = 1;

/** True when quantity is a valid B2B line qty (integer 1…max). */
export function isBottlePackQuantity(quantity: number): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity >= B2B_MIN_LINE_BOTTLES &&
    quantity <= B2B_MAX_PACK_BOTTLES
  );
}

/** Clamp to a valid B2B line quantity (floors to integer, min 1). */
export function clampBottlePackQuantity(quantity: number): number {
  const n = Math.floor(Number(quantity) || 0);
  return Math.max(
    B2B_MIN_LINE_BOTTLES,
    Math.min(B2B_MAX_PACK_BOTTLES, n),
  );
}

/**
 * Normalize a requested B2B quantity (legacy name kept).
 * Odd quantities are kept as-is; only empty/invalid snaps to 1.
 */
export function ceilBottlePackQuantity(quantity: number): number {
  return clampBottlePackQuantity(quantity);
}

/**
 * Snap a legacy/empty B2B line to a valid quantity.
 * Empty → 1; otherwise clamp into 1…max without rounding to packs.
 */
export function normalizeExistingB2BLineQuantity(quantity: number): number {
  const n = Math.max(0, Math.floor(Number(quantity) || 0));
  if (n <= 0) return B2B_MIN_LINE_BOTTLES;
  return Math.min(B2B_MAX_PACK_BOTTLES, n);
}

/**
 * Merge an add-delta onto an existing B2B line (simple sum, clamped).
 */
export function mergeB2BPackQuantity(
  existingQuantity: number,
  deltaQuantity: number,
): number {
  const existing = Math.max(0, Math.floor(Number(existingQuantity) || 0));
  const delta = Math.max(0, Math.floor(Number(deltaQuantity) || 0));
  return clampBottlePackQuantity(existing + delta);
}
