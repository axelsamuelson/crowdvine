import type { AppLocale } from "@/lib/i18n/locale";
import {
  WINE_REGIONS,
  wineRegionEnWithArticle,
  type WineRegion,
  type WineRegionSlug,
} from "@/lib/wine-regions";

/**
 * Marketing-owned copy slots for region landing pages.
 * Intro is filled from Margaux; longer body fields stay empty until PR4.
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

function wholesalerIntroSv(region: WineRegion): string {
  return `Naturvin från ${region.labelSv}, köpt via grossist i Languedoc och samlastad på samma pall.`;
}

function wholesalerIntroEn(region: WineRegion): string {
  return `Natural wine from ${wineRegionEnWithArticle(region)}, bought through a wholesaler in the Languedoc and shipped on the same shared pallet.`;
}

function buildIntroMap(): WineRegionContentMap {
  const map: WineRegionContentMap = {};
  for (const region of WINE_REGIONS) {
    if (region.slug === "languedoc") {
      map.languedoc = {
        sv: {
          intro:
            "Naturvin från Languedoc som vi köper direkt av producenterna och skickar på delade pallar.",
        },
        en: {
          intro:
            "Natural wine from the Languedoc, bought directly from the producers and shipped on shared pallets.",
        },
      };
      continue;
    }
    map[region.slug] = {
      sv: { intro: wholesalerIntroSv(region) },
      en: { intro: wholesalerIntroEn(region) },
    };
  }
  return map;
}

/** Per-region SV+EN intro (and future body slots). */
export const WINE_REGION_CONTENT: WineRegionContentMap = buildIntroMap();

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
