import type { AppLocale } from "@/lib/i18n/locale";
import type { WineRegionSlug } from "@/lib/wine-regions";

/**
 * Marketing-owned copy slots for region landing pages.
 * Leave fields empty / null until PR4 fills them — pages ship with a neutral
 * heading (region label) only; do not invent final marketing copy here.
 */
export type WineRegionContentFields = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  intro?: string | null;
  characteristicsHeading?: string | null;
  characteristicsBody?: string | null;
  locationBlurb?: string | null;
};

export type WineRegionContentMap = Partial<
  Record<WineRegionSlug, Partial<Record<AppLocale, WineRegionContentFields>>>
>;

/** Empty slots for Margaux / marketing — filled in a later content PR. */
export const WINE_REGION_CONTENT: WineRegionContentMap = {
  languedoc: { sv: {}, en: {} },
  beaujolais: { sv: {}, en: {} },
  loire: { sv: {}, en: {} },
  bourgogne: { sv: {}, en: {} },
  jura: { sv: {}, en: {} },
  champagne: { sv: {}, en: {} },
  rhone: { sv: {}, en: {} },
  roussillon: { sv: {}, en: {} },
  alsace: { sv: {}, en: {} },
  "sud-ouest": { sv: {}, en: {} },
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
    content.intro?.trim() ||
      content.characteristicsHeading?.trim() ||
      content.characteristicsBody?.trim() ||
      content.locationBlurb?.trim(),
  );
}
