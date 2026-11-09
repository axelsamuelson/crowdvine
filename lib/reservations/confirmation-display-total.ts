/**
 * Customer-facing confirmation total: wine (post-discount) + shipping,
 * rounded to whole kronor (matches checkout CTA / approved copy).
 */
export function confirmationDisplayTotalSek(input: {
  totalSek: number | null | undefined;
  shippingRevenueGrossCents?: number | null | undefined;
  wineSubtotalCentsFallback?: number | null | undefined;
}): number {
  const shippingSek =
    Math.max(0, Math.round(Number(input.shippingRevenueGrossCents) || 0)) / 100;
  const wineTotalSek =
    input.totalSek != null && Number.isFinite(Number(input.totalSek))
      ? Number(input.totalSek)
      : Math.max(0, Number(input.wineSubtotalCentsFallback) || 0) / 100;
  return Math.round(wineTotalSek + shippingSek);
}

/**
 * Map fulfillment_channel to the legacy confirmation `order_type` field.
 * Avoid selecting a missing `order_type` column on older/preview DBs.
 */
export function confirmationOrderTypeFromFulfillment(
  fulfillmentChannel: string | null | undefined,
): "warehouse" | "producer" {
  return fulfillmentChannel === "warehouse" ||
    fulfillmentChannel === "direct_box"
    ? "warehouse"
    : "producer";
}
