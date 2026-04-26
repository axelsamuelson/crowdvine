/** Shared delivery band copy for checkout UI and {@link getPalletFillData} (no server deps). */
export type PalletEstimatedDeliveryBand =
  | "2-4 weeks"
  | "1-2 weeks"
  | "Within 1 week";

export function deliveryEstimateLabelFromFillPercent(
  fillPercent: number,
): PalletEstimatedDeliveryBand {
  if (fillPercent < 50) return "2-4 weeks";
  if (fillPercent < 80) return "1-2 weeks";
  return "Within 1 week";
}
