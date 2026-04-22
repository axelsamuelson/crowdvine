export type DiscountTier = 0 | 10 | 20;

/**
 * Early-bird tier from bottles already reserved on the conceptual 300-bottle scale.
 * 0–99 → 20%, 100–199 → 10%, 200+ → 0%.
 */
export function getPalletDiscountTier(bottlesFilled: number): DiscountTier {
  if (bottlesFilled < 100) return 20;
  if (bottlesFilled < 200) return 10;
  return 0;
}

/**
 * Multiplicative discount on top of an already member-discounted price.
 * Example: 200 SEK member price with tier 20 → 200 * 0.80 = 160 SEK.
 */
export function applyPalletDiscount(
  priceInclVat: number,
  tier: DiscountTier,
): number {
  if (tier === 0) return priceInclVat;
  const factor = tier === 20 ? 0.8 : 0.9;
  return Math.round(priceInclVat * factor);
}
