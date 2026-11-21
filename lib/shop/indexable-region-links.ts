import type { AppLocale } from "@/lib/i18n/locale";
import { getLiveWineRegionCountsMap } from "@/lib/wine-region-live-counts";
import {
  WINE_REGION_INDEX_MIN_LIVE,
  getLinkableWineRegions,
  wineRegionPagePath,
  type WineRegion,
} from "@/lib/wine-regions";

export type IndexableRegionLink = {
  href: string;
  label: string;
  slug: WineRegion["slug"];
};

/** Region PLP links that pass the sitemap / indexability gate (≥ min live wines). */
export function indexableRegionLinksFromCounts(
  locale: AppLocale,
  liveCountsByValue: ReadonlyMap<string, number>,
): IndexableRegionLink[] {
  return getLinkableWineRegions(
    liveCountsByValue,
    WINE_REGION_INDEX_MIN_LIVE,
  ).map((region) => ({
    slug: region.slug,
    href: wineRegionPagePath(region.slug, locale),
    label: locale === "sv" ? region.labelSv : region.labelEn,
  }));
}

export async function getIndexableRegionLinks(
  locale: AppLocale,
): Promise<IndexableRegionLink[]> {
  try {
    const counts = await getLiveWineRegionCountsMap();
    return indexableRegionLinksFromCounts(locale, counts);
  } catch {
    return [];
  }
}
