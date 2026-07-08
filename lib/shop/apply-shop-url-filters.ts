import type { Product } from "@/lib/shopify/types";
import { filterProductsByColors } from "@/lib/shop/filter-products-by-color";
import { filterProductsByGrapes } from "@/lib/shop/filter-products-by-grape";
import { filterProductsByFarming } from "@/lib/shop/farming-filter";
import { filterProductsBySource } from "@/lib/shop/filter-products-by-source";

function arrayParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = searchParams[key];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

  if (colorFilters.length) out = filterProductsByColors(out, colorFilters);
  if (grapeFilters.length) out = filterProductsByGrapes(out, grapeFilters);
  if (farmingFilters.length) out = filterProductsByFarming(out, farmingFilters);
  if (sourceFilters.length)
    out = filterProductsBySource(out, sourceFilters, wineSourceSlugs);

  return out;
}
