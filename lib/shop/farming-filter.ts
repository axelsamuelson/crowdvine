import type { CatalogCertification } from "@/lib/catalog-types";
import { producerCertificationRegistryUrl } from "@/lib/product/wine-enrichment";
import { isSeedVerifiedOrganicProducer } from "@/lib/shop/verified-organic-producers";
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

/**
 * Organic shop filter: keep label/slug `organic_certified`, but only wines whose
 * producer has a verified organic registry URL and is not in conversion.
 * Falls back to the 269 seed allowlist when verification columns are not loaded.
 */
export function productQualifiesForOrganicShopFilter(
  product: Product,
): boolean {
  if (getProductFarming(product) !== "organic_certified") return false;

  if (product.producerCertificationVerifiedUrl !== undefined) {
    const url = producerCertificationRegistryUrl(
      product.producerCertificationVerifiedUrl,
    );
    if (!url) return false;
    return product.producerCertificationInConversion !== true;
  }

  return isSeedVerifiedOrganicProducer(product.producerName);
}

export function productMatchesFarmingFilter(
  product: Product,
  farmingValue: string,
): boolean {
  if (farmingValue === "organic_certified") {
    return productQualifiesForOrganicShopFilter(product);
  }
  const farming = getProductFarming(product);
  return farming != null && farming === farmingValue;
}

export function filterProductsByFarming(
  products: Product[],
  farmingValues: string[],
): Product[] {
  if (!farmingValues?.length) return products;
  const wanted = [...new Set(farmingValues)];
  return products.filter((product) =>
    wanted.some((value) => productMatchesFarmingFilter(product, value)),
  );
}

export function countProductsByFarming(
  products: Product[],
): Map<ShopFarmingUiFilterValue, number> {
  const counts = new Map<ShopFarmingUiFilterValue, number>();
  for (const value of SHOP_FARMING_UI_FILTER_VALUES) {
    counts.set(value, 0);
  }
  for (const product of products) {
    for (const value of SHOP_FARMING_UI_FILTER_VALUES) {
      if (productMatchesFarmingFilter(product, value)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
  }
  return counts;
}
