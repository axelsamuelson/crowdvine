/**
 * Core price formula (unrounded):
 *   (cost × FX + alcohol_tax [+ shipping]) / (1 − margin)  [× (1 + VAT) for B2C]
 *
 * All intermediate amounts are returned in öre (may be fractional). Rounding is
 * applied once by the caller via {@link applyRounding}.
 */
import { resolveWineAlcoholTaxCents } from "@/lib/wine-alcohol-tax";
import type {
  PriceBreakdown,
  PriceInput,
  PricingChannel,
} from "@/lib/pricing/types";

export type RawFormulaResult = {
  breakdown: PriceBreakdown;
  /** Unrounded channel total in SEK (incl. VAT for B2C; excl. for B2B). */
  rawTotalSek: number;
  isValid: boolean;
};

/**
 * Run the shared margin formula without rounding.
 *
 * B2C: VAT applied after margin. Shipping is ignored.
 * B2B: excl. VAT; shipping_per_bottle enters the cost base.
 */
export function computeRawFormula(
  input: PriceInput,
  opts: {
    channel: PricingChannel;
    resolvedFx: number;
    vatRate: number;
  },
): RawFormulaResult {
  const alcoholTaxOre = resolveWineAlcoholTaxCents(input.alcoholTaxCents);
  const costOre = (input.costAmount || 0) * opts.resolvedFx * 100;
  const shippingOre =
    opts.channel === "b2b"
      ? Math.max(0, input.shippingPerBottleSek ?? 0) * 100
      : 0;

  const costBaseOre = costOre + alcoholTaxOre + shippingOre;
  const marginDecimal = (input.marginPercentage || 0) / 100;
  const denom = 1 - marginDecimal;
  const isValid =
    denom > 0 &&
    Number.isFinite(costBaseOre) &&
    Number.isFinite(opts.resolvedFx) &&
    opts.resolvedFx > 0;

  const priceExVatOre = isValid ? costBaseOre / denom : 0;
  const marginOre = priceExVatOre - costBaseOre;
  const vatOre =
    opts.channel === "b2c" && opts.vatRate > 0
      ? priceExVatOre * opts.vatRate
      : 0;
  const rawTotalOre = priceExVatOre + vatOre;
  const rawTotalSek = rawTotalOre / 100;

  return {
    isValid,
    rawTotalSek,
    breakdown: {
      costOre,
      alcoholTaxOre,
      shippingOre,
      costBaseOre,
      marginOre,
      priceExVatOre,
      vatOre,
      resolvedFx: opts.resolvedFx,
      marginPercentage: input.marginPercentage || 0,
    },
  };
}
