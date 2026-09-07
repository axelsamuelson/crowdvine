/** Dirty Wine (B2B) sells wines in packs matching the 6-bottle producer rule. */
export const BOTTLE_PACK_SIZE = 6;

/** Max bottles selectable on B2B PDP (16 packs). */
export const B2B_MAX_PACK_BOTTLES = 96;

export function isBottlePackQuantity(quantity: number): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity > 0 &&
    quantity % BOTTLE_PACK_SIZE === 0
  );
}

/** Clamp to a valid pack quantity within B2B min/max (floors down). */
export function clampBottlePackQuantity(quantity: number): number {
  const n = Math.max(
    BOTTLE_PACK_SIZE,
    Math.min(B2B_MAX_PACK_BOTTLES, Math.floor(Number(quantity) || 0)),
  );
  return Math.floor(n / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE;
}

/** Round up to the next full pack (min one pack). */
export function ceilBottlePackQuantity(quantity: number): number {
  const n = Math.max(1, Math.floor(Number(quantity) || 0));
  const ceiled =
    Math.ceil(n / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE;
  return Math.min(B2B_MAX_PACK_BOTTLES, Math.max(BOTTLE_PACK_SIZE, ceiled));
}

/**
 * Snap a legacy/odd B2B line to a valid pack quantity.
 * Orphans 1–5 → one pack; 7–11 → one pack (drop remainder).
 */
export function normalizeExistingB2BLineQuantity(quantity: number): number {
  const n = Math.max(0, Math.floor(Number(quantity) || 0));
  if (n <= 0) return BOTTLE_PACK_SIZE;
  if (isBottlePackQuantity(n)) {
    return Math.min(B2B_MAX_PACK_BOTTLES, n);
  }
  const floored = Math.floor(n / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE;
  return floored >= BOTTLE_PACK_SIZE
    ? Math.min(B2B_MAX_PACK_BOTTLES, floored)
    : BOTTLE_PACK_SIZE;
}

/**
 * Merge an add-delta onto an existing B2B line.
 * Drops non-pack remainder on the existing line, then adds the pack delta.
 * Example: existing 1 + add 6 → 6 (not 7).
 */
export function mergeB2BPackQuantity(
  existingQuantity: number,
  deltaQuantity: number,
): number {
  const existing = Math.max(0, Math.floor(Number(existingQuantity) || 0));
  const delta = Math.max(0, Math.floor(Number(deltaQuantity) || 0));
  const base = isBottlePackQuantity(existing)
    ? existing
    : Math.floor(existing / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE;
  return clampBottlePackQuantity(base + delta);
}
