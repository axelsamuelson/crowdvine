import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { getProducerHandle } from "@/lib/producer-handle";
import { shopPathForLocale } from "@/lib/i18n/localized-routes";
import { producerDisplayName } from "@/lib/producer-display-name";

/** Shop PLP heading, e.g. "Clos Fantine viner" / "Clos Fantine wines". */
export function producerShopPageHeading(
  producerName: string,
  locale: AppLocale,
  displayName?: string | null,
): string {
  return translate(locale, "product.pdp.breadcrumbProducerWines", {
    producer: producerDisplayName({
      name: producerName,
      display_name: displayName,
    }),
  });
}

export function producerShopPagePath(
  producerName: string,
  locale: AppLocale,
): string {
  return `${shopPathForLocale(locale)}/${getProducerHandle(producerName)}`;
}
