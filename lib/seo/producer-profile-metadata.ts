import type { AppLocale } from "@/lib/i18n/locale";
import { firstSentence } from "@/lib/text/first-sentence";

const META_DESCRIPTION_MAX_LENGTH = 155;

/**
 * Opt-in map: producer slug → winemaker display name for profile titles.
 * Only when the person name differs from the producer brand (e.g. Sybil ≠ La Graine Sauvage).
 */
export const PRODUCER_WINEMAKER_TITLE_BY_SLUG: Record<string, string> = {
  "la-graine-sauvage": "Sybil Baldassarre",
};

function producerPossessive(producerName: string, locale: AppLocale): string {
  const name = producerName.trim();
  return locale === "sv" ? `${name}s` : `${name}'s`;
}

export function resolveProducerWinemakerForTitle(
  slug: string,
  contactName?: string | null,
): string | null {
  const mapped = PRODUCER_WINEMAKER_TITLE_BY_SLUG[slug]?.trim();
  if (!mapped) return null;

  const contact = contactName?.trim();
  // Prefer DB contact_name when it matches the opt-in mapping (case-insensitive).
  if (contact && contact.toLowerCase() === mapped.toLowerCase()) {
    return contact;
  }
  return mapped;
}

export function producerProfilePageTitle(
  producerName: string,
  locale: AppLocale,
  region?: string | null,
  options?: { winemakerName?: string | null },
): string {
  const name = producerName.trim();
  const regionPart = region?.trim() || "Languedoc";
  const winemaker = options?.winemakerName?.trim();
  const namePart =
    winemaker && winemaker.toLowerCase() !== name.toLowerCase()
      ? `${name} (${winemaker})`
      : name;

  return locale === "sv"
    ? `${namePart} — naturvinproducent i ${regionPart}`
    : `${namePart} — natural wine producer in ${regionPart}`;
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
