import type { AppLocale } from "@/lib/i18n/locale";
import { getProducerShopEditorialOverride } from "@/lib/producer-shop-content";
import { firstSentence } from "@/lib/text/first-sentence";

const META_DESCRIPTION_MAX_LENGTH = 155;

function producerPossessive(producerName: string, locale: AppLocale): string {
  const name = producerName.trim();
  return locale === "sv" ? `${name}s` : `${name}'s`;
}

export function producerShopPageTitle(
  producerName: string,
  locale: AppLocale,
): string {
  const name = producerName.trim();
  return locale === "sv"
    ? `${name} viner — köp naturvin direkt`
    : `${name} wines — buy natural wine direct`;
}

export function producerShopEditorialHeading(
  producerName: string,
  locale: AppLocale,
): string {
  const name = producerName.trim();
  return locale === "sv"
    ? `Köp viner från ${name}`
    : `Buy wines from ${name}`;
}

function shopMetaLeadFromEditorial(
  handle: string | undefined,
  locale: AppLocale,
): string | null {
  if (!handle?.trim()) return null;
  const editorial = getProducerShopEditorialOverride(handle.trim(), locale);
  if (!editorial) return null;
  return firstSentence(editorial);
}

export function producerShopMetaDescription(
  locale: AppLocale,
  options: {
    producerName: string;
    handle?: string;
  },
): string {
  const { producerName, handle } = options;
  const possessive = producerPossessive(producerName, locale);
  const prefix =
    locale === "sv"
      ? `Köp ${possessive} naturviner direkt från Languedoc. `
      : `Buy ${possessive} natural wines direct from Languedoc. `;
  const stockholmSuffix =
    locale === "sv"
      ? " Hemleverans i Stockholm."
      : " Home delivery in Stockholm.";

  const lead =
    shopMetaLeadFromEditorial(handle, locale) ??
    (locale === "sv"
      ? "Reservera flaskor innan pallen till Stockholm fylls."
      : "Reserve bottles before the Stockholm pallet fills.");

  const withStockholm = `${prefix}${lead}${stockholmSuffix}`;
  if (withStockholm.length <= META_DESCRIPTION_MAX_LENGTH) {
    return withStockholm;
  }
  const withoutStockholm = `${prefix}${lead}`;
  if (withoutStockholm.length <= META_DESCRIPTION_MAX_LENGTH) {
    return withoutStockholm;
  }
  const budget = META_DESCRIPTION_MAX_LENGTH - prefix.length;
  if (budget <= 10) {
    return withoutStockholm.slice(0, META_DESCRIPTION_MAX_LENGTH);
  }
  const truncated =
    lead.length <= budget ? lead : `${lead.slice(0, budget - 1).trimEnd()}…`;
  return `${prefix}${truncated}`;
}
