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

export const NOINDEX_CATEGORY_SLUGS_SV = new Set([
  "rod-och-orange-biodynamiskt-vin",
  "rod-och-vit-biodynamiskt-vin",
  "rod-och-orange-ekologiskt-vin",
  "rod-och-vit-ekologiskt-vin",
  "rod-och-orange-naturvin",
  "rod-och-vit-naturvin",
  "orange-biodynamiskt-vin",
  "vitt-biodynamiskt-vin",
  "rott-biodynamiskt-vin",
  "orange-ekologiskt-vin",
  "vitt-ekologiskt-vin",
  "biodynamiskt-vin",
]);

export const NOINDEX_CATEGORY_SLUGS_EN = new Set([
  "red-and-orange-biodynamic-wine",
  "red-and-white-biodynamic-wine",
  "red-and-orange-organic-wine",
  "red-and-white-organic-wine",
  "red-and-orange-natural-wine",
  "red-and-white-natural-wine",
  "orange-biodynamic-wine",
  "white-biodynamic-wine",
  "red-biodynamic-wine",
  "orange-organic-wine",
  "white-organic-wine",
  "biodynamic-wine",
]);

type ShopSearchParams = { [key: string]: string | string[] | undefined };

function isNoindexCategorySlug(slug: string, locale: "sv" | "en"): boolean {
  return locale === "sv"
    ? NOINDEX_CATEGORY_SLUGS_SV.has(slug)
    : NOINDEX_CATEGORY_SLUGS_EN.has(slug);
}

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
