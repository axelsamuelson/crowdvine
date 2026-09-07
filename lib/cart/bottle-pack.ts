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

/** Clamp to a valid pack quantity within B2B min/max. */
export function clampBottlePackQuantity(quantity: number): number {
  const n = Math.max(
    BOTTLE_PACK_SIZE,
    Math.min(B2B_MAX_PACK_BOTTLES, Math.floor(Number(quantity) || 0)),
  );
  return Math.floor(n / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE;
}
