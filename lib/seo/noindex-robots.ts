import type { Metadata } from "next";

import { shopSearchParamsRobots } from "@/lib/seo/shop-search-robots";
import type { WineCategory } from "@/lib/wine-category-types";
import { isGrapeOnlyCategory } from "@/lib/wine-grape-categories";

/** Private / session pages that should never appear in search results. */
export const NOINDEX_PAGE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};

/** Low-value pages that should not be indexed but remain crawlable. */
export const NOINDEX_FOLLOW_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
};

/** Red & White / Red & Orange filter pages (any farming combo). */
const TWO_COLOR_SLUG_PREFIXES: Record<"sv" | "en", readonly string[]> = {
  sv: ["rod-och-vit", "rod-och-orange"],
  en: ["red-and-white", "red-and-orange"],
};

export function isTwoColorCategorySlug(
  slug: string,
  locale: "sv" | "en",
): boolean {
  return TWO_COLOR_SLUG_PREFIXES[locale].some(
    (prefix) =>
      slug === `${prefix}-vin` ||
      slug === `${prefix}-wine` ||
      slug.startsWith(`${prefix}-`),
  );
}

/**
 * Dynamic grape PLPs built from grape names alone — one-line copy, no editorial.
 * Keep crawlable for internal links; do not index.
 */
export function isThinDynamicGrapeCategory(category: WineCategory): boolean {
  return (
    isGrapeOnlyCategory(category) && !Boolean(category.longDescription?.trim())
  );
}

export function isNoindexCategorySlug(
  slug: string,
  locale: "sv" | "en",
): boolean {
  return isTwoColorCategorySlug(slug, locale);
}

type ShopSearchParams = { [key: string]: string | string[] | undefined };

/**
 * Robots for shop category / collection listings.
 * Empty product sets, thin dynamic grape PLPs, and region pages under the
 * live-wine index minimum are noindex,follow.
 */
export function categoryPageRobots(
  slug: string,
  locale: "sv" | "en",
  searchParams?: ShopSearchParams,
  options?: {
    emptyListing?: boolean;
    thinDynamicGrape?: boolean;
    /** Region PLP with fewer than WINE_REGION_INDEX_MIN_LIVE wines. */
    regionBelowIndexMinimum?: boolean;
  },
): NonNullable<Metadata["robots"]> | undefined {
  if (
    isNoindexCategorySlug(slug, locale) ||
    options?.emptyListing ||
    options?.thinDynamicGrape ||
    options?.regionBelowIndexMinimum
  ) {
    return NOINDEX_FOLLOW_ROBOTS;
  }

  return shopSearchParamsRobots(searchParams);
}

/** Prefer noindex,follow when a listing has zero products. */
export function emptyListingRobots(
  searchParams?: ShopSearchParams,
): NonNullable<Metadata["robots"]> {
  return shopSearchParamsRobots(searchParams) ?? NOINDEX_FOLLOW_ROBOTS;
}
