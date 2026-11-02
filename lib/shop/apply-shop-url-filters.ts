import type { Product } from "@/lib/shopify/types";
import { filterProductsByColors } from "@/lib/shop/filter-products-by-color";
import { filterProductsByGrapes } from "@/lib/shop/filter-products-by-grape";
import { filterProductsByFarming } from "@/lib/shop/farming-filter";
import { filterProductsByRegions } from "@/lib/shop/filter-products-by-region";
import { filterProductsBySource } from "@/lib/shop/filter-products-by-source";
import {
  filterAndRankProductsBySearch,
  parseShopSearchScope,
} from "@/lib/shop/shop-product-search";
import { parseWineRegionParam } from "@/lib/wine-regions";

function arrayParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = searchParams[key];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stringParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export function applyShopUrlFilters(
  products: Product[],
  searchParams: Record<string, string | string[] | undefined>,
  wineSourceSlugs: Record<string, string[]> = {},
): Product[] {
  let out = products;

  const colorFilters = arrayParam(searchParams, "fcolor");
  const grapeFilters = arrayParam(searchParams, "fgrape");
  const farmingFilters = arrayParam(searchParams, "ffarming");
  const sourceFilters = arrayParam(searchParams, "fsource");
  // `region` is producers-style: comma-separated in a single param (and/or repeated).
  const regionFilters = parseWineRegionParam(searchParams.region);
  const searchQuery = stringParam(searchParams, "q");
  const searchScope = parseShopSearchScope(stringParam(searchParams, "qscope"));

  if (colorFilters.length) out = filterProductsByColors(out, colorFilters);
  if (grapeFilters.length) out = filterProductsByGrapes(out, grapeFilters);
  if (farmingFilters.length) out = filterProductsByFarming(out, farmingFilters);
  if (regionFilters.length) out = filterProductsByRegions(out, regionFilters);
  if (sourceFilters.length)
    out = filterProductsBySource(out, sourceFilters, wineSourceSlugs);

  // Search last so relevance ranking applies to the filtered subset.
  if (searchQuery.trim()) {
    out = filterAndRankProductsBySearch(out, searchQuery, searchScope);
  }

  return out;
}
