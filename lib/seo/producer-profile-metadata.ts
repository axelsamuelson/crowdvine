import type { AppLocale } from "@/lib/i18n/locale";
import { firstSentence } from "@/lib/text/first-sentence";

const META_DESCRIPTION_MAX_LENGTH = 155;

function producerPossessive(producerName: string, locale: AppLocale): string {
  const name = producerName.trim();
  return locale === "sv" ? `${name}s` : `${name}'s`;
}

export function producerProfilePageTitle(
  producerName: string,
  locale: AppLocale,
  region?: string | null,
): string {
  const name = producerName.trim();
  const regionPart = region?.trim() || "Languedoc";
  return locale === "sv"
    ? `${name} — naturvinproducent i ${regionPart}`
    : `${name} — natural wine producer in ${regionPart}`;
}

export function producerProfileMetaDescription(
  locale: AppLocale,
  options: {
    producerName: string;
    bioShort?: string | null;
  },
): string {
  const { producerName, bioShort } = options;
  const possessive = producerPossessive(producerName, locale);
  const lead = firstSentence(bioShort);
  const suffix =
    locale === "sv"
      ? ` Upptäck ${possessive} naturviner — direktimport från Languedoc via PACT.`
      : ` Discover ${possessive} natural wines — direct import from Languedoc via PACT.`;

  if (lead) {
    const withSuffix = `${lead}${suffix}`;
    if (withSuffix.length <= META_DESCRIPTION_MAX_LENGTH) {
      return withSuffix;
    }
    if (lead.length <= META_DESCRIPTION_MAX_LENGTH) {
      return lead;
    }
    return `${lead.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
  }

  return suffix.trim();
}
