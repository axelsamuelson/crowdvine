import { calculateRoundedB2BPriceExclVat } from "@/lib/price-breakdown";

/** Whole-SEK B2B unit price → öre for `b2b_inquiry_lines.unit_price_cents`. */
export function b2bExclVatSekToUnitPriceCents(priceExclVatSek: number): number {
  return Math.round(priceExclVatSek * 100);
}

/**
 * Same B2B excl. VAT unit price the Dirty Wine product card shows
 * (`calculateRoundedB2BPriceExclVat`), or null when inputs are incomplete.
 */
export function computeInquiryB2bUnitPriceExclVatSek(opts: {
  costAmount: number;
  exchangeRate: number;
  alcoholTaxCents: number;
  b2bMarginPercentage: number | null | undefined;
  shippingPerBottleSek?: number;
}): number | null {
  const margin = opts.b2bMarginPercentage;
  if (
    margin == null ||
    !Number.isFinite(margin) ||
    margin < 0 ||
    margin >= 100 ||
    !(opts.costAmount > 0)
  ) {
    return null;
  }
  return calculateRoundedB2BPriceExclVat(
    opts.costAmount,
    opts.exchangeRate,
    opts.alcoholTaxCents ?? 0,
    margin,
    opts.shippingPerBottleSek ?? 0,
  );
}

/** Prefer product.b2bPriceExclVat (card price); never derive from B2C incl. VAT. */
export function cartLineB2bUnitPriceExclVat(product: {
  b2bPriceExclVat?: number | null;
  priceBreakdown?: { b2bPriceExclVat?: number | null } | null;
}): number | null {
  const raw =
    product.b2bPriceExclVat ?? product.priceBreakdown?.b2bPriceExclVat ?? null;
  if (raw == null || !Number.isFinite(Number(raw)) || Number(raw) <= 0) {
    return null;
  }
  return Math.round(Number(raw));
}

/** Line total excl. VAT = unit × quantity (same as email/DB). */
export function inquiryLineTotalExclVatSek(
  unitPriceExclVatSek: number,
  quantity: number,
): number {
  return unitPriceExclVatSek * quantity;
}

/** Cart line total in B2B mode: b2bPriceExclVat × quantity (never B2C/1.25). */
export function cartLineB2bLineTotalExclVat(
  product: {
    b2bPriceExclVat?: number | null;
    priceBreakdown?: { b2bPriceExclVat?: number | null } | null;
  },
  quantity: number,
): number {
  const unit = cartLineB2bUnitPriceExclVat(product);
  if (unit == null) return 0;
  return unit * quantity;
}
