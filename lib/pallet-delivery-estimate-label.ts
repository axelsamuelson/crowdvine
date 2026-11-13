import type { AppLocale } from "@/lib/i18n/locale";

/** Shared delivery estimate copy for checkout UI and {@link getPalletFillData} (no server deps). */
export const PALLET_DELIVERY_ESTIMATE_LABEL = {
  sv: "Levereras normalt 2–3 veckor efter att pallen stänger",
  en: "Delivered normally 2–3 weeks after the pallet closes",
} as const;

export type PalletDeliveryEstimateLabel =
  (typeof PALLET_DELIVERY_ESTIMATE_LABEL)[AppLocale];

/**
 * Fixed shared-pallet delivery estimate. Fill percent no longer changes the band;
 * the separate fill indicator stays independent.
 */
export function palletDeliveryEstimateLabel(
  locale: AppLocale = "sv",
): PalletDeliveryEstimateLabel {
  return PALLET_DELIVERY_ESTIMATE_LABEL[locale];
}
