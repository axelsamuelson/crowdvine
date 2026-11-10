/** Marker on promo_discount_codes.description for Nov 2026 points→coupon conversion. */
export const PACT_POINTS_CONVERSION_DESCRIPTION =
  "pact_points_conversion_2026-11-10";

export function isPactPointsConversionCoupon(
  description: string | null | undefined,
): boolean {
  return description === PACT_POINTS_CONVERSION_DESCRIPTION;
}

/** Wine-only SEK from cart lines (excludes shipping). */
export function wineAmountSekFromItems(
  items: Array<{ quantity: number; unit_price: number }>,
): number {
  let sum = 0;
  for (const item of items) {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const unit = Math.max(0, Number(item.unit_price) || 0);
    if (qty <= 0 || unit <= 0) continue;
    sum += qty * unit;
  }
  return sum;
}
