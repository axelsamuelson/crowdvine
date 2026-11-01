/**
 * Pricing consolidation step 2 — single source of truth for the unit-price
 * formula. **Not wired into production surfaces yet** (no behaviour change).
 *
 * Formula (öre):
 *   (cost × FX + alcohol tax [+ B2B shipping per bottle]) / (1 − margin)
 *   then × (1 + VAT) for B2C; B2B stays excl. VAT.
 *
 * FX source and rounding mode are explicit {@link PricingConfig} fields —
 * Axel has not decided the product-wide defaults; use presets in `defaults`
 * to match today's golden-locked surfaces from PR #143.
 *
 * Rounding is applied once, at the end of the base formula. Member and pallet
 * discounts are optional post-processors.
 */
export type {
  DiscountInput,
  FxSource,
  PriceBreakdown,
  PriceInput,
  PriceResult,
  PricingChannel,
  PricingConfig,
  RoundingMode,
} from "@/lib/pricing/types";

export {
  B2B_COMMERCIAL_TODAY,
  B2B_COST_FX_FALLBACK,
  B2B_SHOP_TODAY,
  B2C_RETAIL_FX_FALLBACK,
  B2C_RETAIL_TODAY,
} from "@/lib/pricing/defaults";

export { FALLBACK_SEK_RATES, resolveFxRate } from "@/lib/pricing/fx";
export { applyRounding } from "@/lib/pricing/round";
export { computeRawFormula } from "@/lib/pricing/formula";
export {
  applyB2bMemberDiscountOre,
  applyB2cMemberDiscountOre,
  applyMemberDiscountOre,
  applyPalletDiscountOre,
  getPalletDiscountTier,
  type PalletTier,
} from "@/lib/pricing/discounts";
export {
  calculateB2bExclVatSek,
  calculateB2cRetailOre,
  calculateUnitPrice,
} from "@/lib/pricing/calculate";
