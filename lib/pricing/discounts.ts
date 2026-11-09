/**
 * Member and pallet discounts applied *after* the base formula rounding.
 *
 * Behaviour mirrors today's surfaces (price-breakdown + pallet-discount) so
 * goldens stay reproducible; each discount stage has its own rounding.
 */
import type { PricingChannel } from "@/lib/pricing/types";

export type PalletTier = 0 | 10 | 20;

/**
 * B2C member discount on gross list price (öre).
 * Matches `memberDiscountedTotalInclVat`: half-up whole kronor after float normalization.
 */
export function applyB2cMemberDiscountOre(
  listTotalOre: number,
  memberDiscountPercent: number,
): number {
  if (!(memberDiscountPercent > 0) || !(listTotalOre > 0)) return listTotalOre;
  const listSek = listTotalOre / 100;
  const raw = listSek * (1 - memberDiscountPercent / 100);
  return Math.round(Number.parseFloat(raw.toFixed(2))) * 100;
}

/**
 * B2B member discount applied to margin only (öre).
 * Matches `calculateB2BPriceWithDiscount` (ceil to 2 dp SEK).
 */
export function applyB2bMemberDiscountOre(
  listTotalOre: number,
  b2bMarginPercentage: number,
  memberDiscountPercent: number,
): number {
  if (!(memberDiscountPercent > 0) || !(listTotalOre > 0)) return listTotalOre;
  const b2bPriceExclVat = listTotalOre / 100;
  const costPlusTax = b2bPriceExclVat * (1 - b2bMarginPercentage / 100);
  const originalMargin = b2bPriceExclVat - costPlusTax;
  const discountedMargin =
    originalMargin * (1 - memberDiscountPercent / 100);
  const newPrice = costPlusTax + discountedMargin;
  return (Math.ceil(newPrice * 100) / 100) * 100;
}

/**
 * Early-bird pallet tier on top of an already member-discounted B2C price.
 * Matches `applyPalletDiscount`: Math.round(sek * 0.8|0.9).
 */
export function applyPalletDiscountOre(
  priceOre: number,
  tier: PalletTier,
): number {
  if (tier === 0 || !(priceOre > 0)) return priceOre;
  const factor = tier === 20 ? 0.8 : 0.9;
  return Math.round((priceOre / 100) * factor) * 100;
}

/** Tier from bottles already reserved on the 300-bottle scale. */
export function getPalletDiscountTier(bottlesFilled: number): PalletTier {
  if (bottlesFilled < 100) return 20;
  if (bottlesFilled < 200) return 10;
  return 0;
}

export function applyMemberDiscountOre(
  channel: PricingChannel,
  listTotalOre: number,
  marginPercentage: number,
  memberDiscountPercent: number,
): number {
  if (channel === "b2c") {
    return applyB2cMemberDiscountOre(listTotalOre, memberDiscountPercent);
  }
  return applyB2bMemberDiscountOre(
    listTotalOre,
    marginPercentage,
    memberDiscountPercent,
  );
}
