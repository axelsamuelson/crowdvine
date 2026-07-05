import type { AppLocale } from "@/lib/i18n/locale";
import { extractWineText } from "@/lib/i18n/wine-locale";
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

export function producerShopMetaDescription(
  locale: AppLocale,
  options: {
    producerName: string;
    region?: string | null;
    shortDescription?: Record<string, string> | string | null;
  },
): string {
  const { producerName, region, shortDescription } = options;
  const possessive = producerPossessive(producerName, locale);
  const shortText = extractWineText(shortDescription ?? null, locale);
  const lead = firstSentence(shortText);

  if (lead) {
    const prefix =
      locale === "sv"
        ? `Köp ${possessive} naturviner direkt från Languedoc. `
        : `Buy ${possessive} natural wines direct from Languedoc. `;
    const stockholmSuffix =
      locale === "sv"
        ? " Hemleverans i Stockholm."
        : " Home delivery in Stockholm.";
    const withStockholm = `${prefix}${lead}${stockholmSuffix}`;
    if (withStockholm.length <= META_DESCRIPTION_MAX_LENGTH) {
      return withStockholm;
    }
    const withoutStockholm = `${prefix}${lead}`;
    if (withoutStockholm.length <= META_DESCRIPTION_MAX_LENGTH) {
      return withoutStockholm;
    }
    const budget = META_DESCRIPTION_MAX_LENGTH - prefix.length;
    if (budget <= 10) return withoutStockholm.slice(0, META_DESCRIPTION_MAX_LENGTH);
    const truncated =
      lead.length <= budget
        ? lead
        : `${lead.slice(0, budget - 1).trimEnd()}…`;
    return `${prefix}${truncated}`;
  }

  const regionPart = region?.trim() || "Languedoc";
  return locale === "sv"
    ? `Köp ${possessive} naturviner direkt från ${regionPart}, Languedoc. Hemleverans i Stockholm via PACT.`
    : `Buy ${possessive} natural wines direct from ${regionPart}, Languedoc. Home delivery in Stockholm via PACT.`;
}
