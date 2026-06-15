import type { CatalogCertification } from "@/lib/catalog-types";
import type { Product } from "@/lib/shopify/types";

/** Shop sidebar filter values (subset of wines.farming). */
export const SHOP_FARMING_FILTER_VALUES = [
  "organic_certified",
  "natural",
  "biodynamic_certified",
] as const satisfies readonly CatalogCertification[];

export type ShopFarmingFilterValue =
  (typeof SHOP_FARMING_FILTER_VALUES)[number];

export function getProductFarming(product: Product): string | null {
  const value = product.farming ?? product.wineEnrichment?.farming ?? null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function filterProductsByFarming(
  products: Product[],
  farmingValues: string[],
): Product[] {
  if (!farmingValues?.length) return products;
  const wanted = new Set(farmingValues);
  return products.filter((product) => {
    const farming = getProductFarming(product);
    return farming != null && wanted.has(farming);
  });
}

export function countProductsByFarming(
  products: Product[],
): Map<ShopFarmingFilterValue, number> {
  const counts = new Map<ShopFarmingFilterValue, number>();
  for (const value of SHOP_FARMING_FILTER_VALUES) {
    counts.set(value, 0);
  }
  for (const product of products) {
    const farming = getProductFarming(product);
    if (
      farming &&
      (SHOP_FARMING_FILTER_VALUES as readonly string[]).includes(farming)
    ) {
      counts.set(farming as ShopFarmingFilterValue, (counts.get(farming as ShopFarmingFilterValue) ?? 0) + 1);
    }
  }
  return counts;
}
