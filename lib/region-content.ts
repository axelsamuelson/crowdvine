import type { AppLocale } from "@/lib/i18n/locale";
import type { WineRegionSlug } from "@/lib/wine-regions";

/**
 * Marketing-owned copy slots for region landing pages.
 * Only Languedoc has an intro; other regions leave intro empty until PR4.
 */
export type WineRegionContentFields = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  /** One-line intro under H1. Empty → render nothing. */
  intro?: string | null;
  characteristicsHeading?: string | null;
  characteristicsBody?: string | null;
  locationBlurb?: string | null;
};

export type WineRegionContentMap = Partial<
  Record<WineRegionSlug, Partial<Record<AppLocale, WineRegionContentFields>>>
>;

/** Per-region SV+EN intro (and future body slots). Languedoc only for now. */
export const WINE_REGION_CONTENT: WineRegionContentMap = {
  languedoc: {
    sv: {
      intro:
        "Naturvin från Languedoc som vi köper direkt av producenterna och skickar på delade pallar.",
    },
    en: {
      intro:
        "Natural wine from the Languedoc, bought directly from the producers and shipped on shared pallets.",
    },
  },
};

export function getWineRegionContent(
  slug: WineRegionSlug,
  locale: AppLocale,
): WineRegionContentFields {
  return WINE_REGION_CONTENT[slug]?.[locale] ?? {};
}

export function wineRegionContentHasBody(
  content: WineRegionContentFields,
): boolean {
  return Boolean(
    content.characteristicsHeading?.trim() ||
      content.characteristicsBody?.trim() ||
      content.locationBlurb?.trim(),
  );
}
