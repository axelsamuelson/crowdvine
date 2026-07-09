import type { Metadata } from "next";

import { shopSearchParamsRobots } from "@/lib/seo/shop-search-robots";

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

export function isNoindexCategorySlug(
  slug: string,
  locale: "sv" | "en",
): boolean {
  return isTwoColorCategorySlug(slug, locale);
}

type ShopSearchParams = { [key: string]: string | string[] | undefined };

export function categoryPageRobots(
  slug: string,
  locale: "sv" | "en",
  searchParams?: ShopSearchParams,
): NonNullable<Metadata["robots"]> | undefined {
  if (isNoindexCategorySlug(slug, locale)) {
    return NOINDEX_FOLLOW_ROBOTS;
  }

  return shopSearchParamsRobots(searchParams);
}
