import type { AppLocale } from "@/lib/i18n/locale";
import { getProducerHandle } from "@/lib/producer-handle";
import { shopPathForLocale } from "@/lib/i18n/localized-routes";
import { producerDisplayName } from "@/lib/producer-display-name";

/** Shop PLP heading, e.g. "Viner från Clos Fantine" / "Wines from Clos Fantine". */
export function producerShopPageHeading(
  producerName: string,
  locale: AppLocale,
  displayName?: string | null,
): string {
  const producer = producerDisplayName({
    name: producerName,
    display_name: displayName,
  });
  return locale === "sv" ? `Viner från ${producer}` : `Wines from ${producer}`;
}

export function producerShopPagePath(
  producerName: string,
  locale: AppLocale,
): string {
  return `${shopPathForLocale(locale)}/${getProducerHandle(producerName)}`;
}
