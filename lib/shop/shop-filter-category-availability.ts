import { unstable_cache } from "next/cache";

import { catalogHasProducts } from "@/lib/crowdvine/products-data";
import { isNoindexCategorySlug } from "@/lib/seo/noindex-robots";
import { WINE_CATEGORIES_EN, WINE_CATEGORIES_SV } from "@/lib/wine-categories";
import { LEGACY_SHOP_REDIRECT_SLUGS } from "@/lib/wine-shop-filter-categories";

/**
 * Same emptiness rule as sitemap category entries: catalogHasProducts with
 * the category filter and the site B2B flag.
 */
async function categoryHasProductsForSite(
  category: (typeof WINE_CATEGORIES_EN)[number],
  isB2BSite: boolean,
): Promise<boolean> {
  return catalogHasProducts({
    filterColor: category.filter.color,
    filterTags: category.filter.tags,
    filterIsNatural: category.filter.isNatural,
    filterFarming: category.filter.farming,
    filterGrape: category.filter.filterGrape,
    isB2BSite,
  });
}

async function computeNavigableShopFilterPaths(
  isB2BSite: boolean,
): Promise<string[]> {
  const paths = new Set<string>(["/wine", "/vin"]);

  const jobs: Array<Promise<void>> = [];

  for (const category of WINE_CATEGORIES_EN) {
    if (LEGACY_SHOP_REDIRECT_SLUGS.has(category.slug)) continue;
    if (isNoindexCategorySlug(category.slug, "en")) continue;
    jobs.push(
      categoryHasProductsForSite(category, isB2BSite).then((has) => {
        if (has) paths.add(`/wine/${category.slug}`);
      }),
    );
  }

  for (const category of WINE_CATEGORIES_SV) {
    if (LEGACY_SHOP_REDIRECT_SLUGS.has(category.slug)) continue;
    if (isNoindexCategorySlug(category.slug, "sv")) continue;
    jobs.push(
      categoryHasProductsForSite(category, isB2BSite).then((has) => {
        if (has) paths.add(`/vin/${category.slug}`);
      }),
    );
  }

  await Promise.all(jobs);
  return [...paths].sort();
}

/** Cached navigable shop category paths for filter <a href> SSR. */
export function getCachedNavigableShopFilterPaths(
  isB2BSite: boolean,
): Promise<string[]> {
  const key = isB2BSite ? "b2b" : "b2c";
  return unstable_cache(
    () => computeNavigableShopFilterPaths(isB2BSite),
    ["shop-filter-navigable-paths", key],
    { revalidate: 300 },
  )();
}

/** True when path may be used as a crawlable shop filter link. */
export function isNavigableShopFilterPath(
  path: string,
  navigablePaths: readonly string[] | undefined,
): boolean {
  if (!navigablePaths) return true;
  return navigablePaths.includes(path);
}
