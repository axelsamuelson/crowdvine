import type { CatalogCertification } from "@/lib/catalog-types";
import type { Product } from "@/lib/shopify/types";

/**
 * Farming values that exist as shop category filters (incl. legacy natural pages).
 * Natural is the shop default, not a sidebar option — see SHOP_FARMING_UI_FILTER_VALUES.
 */
export const SHOP_FARMING_FILTER_VALUES = [
  "organic_certified",
  "natural",
  "biodynamic_certified",
] as const satisfies readonly CatalogCertification[];

export type ShopFarmingFilterValue =
  (typeof SHOP_FARMING_FILTER_VALUES)[number];

/** Farming options shown in the shop filter panel (natural is the default mode). */
export const SHOP_FARMING_UI_FILTER_VALUES = [
  "organic_certified",
  "biodynamic_certified",
] as const satisfies readonly ShopFarmingFilterValue[];

export type ShopFarmingUiFilterValue =
  (typeof SHOP_FARMING_UI_FILTER_VALUES)[number];

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
): Map<ShopFarmingUiFilterValue, number> {
  const counts = new Map<ShopFarmingUiFilterValue, number>();
  for (const value of SHOP_FARMING_UI_FILTER_VALUES) {
    counts.set(value, 0);
  }
  for (const product of products) {
    const farming = getProductFarming(product);
    if (
      farming &&
      (SHOP_FARMING_UI_FILTER_VALUES as readonly string[]).includes(farming)
    ) {
      counts.set(
        farming as ShopFarmingUiFilterValue,
        (counts.get(farming as ShopFarmingUiFilterValue) ?? 0) + 1,
      );
    }
  }
  return counts;
}
