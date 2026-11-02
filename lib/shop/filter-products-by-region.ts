import type { Product } from "@/lib/shopify/types";
import {
  isWineRegionSlug,
  isWineRegionValue,
  wineRegionBySlug,
  wineRegionSlugFromValue,
  type WineRegionSlug,
} from "@/lib/wine-regions";

/** Resolve a product's canonical wine-region slug from `wines.region`. */
export function getProductWineRegionSlug(
  product: Pick<Product, "region">,
): WineRegionSlug | null {
  const value = product.region;
  if (!value) return null;
  if (isWineRegionSlug(value)) return value;
  if (isWineRegionValue(value)) return wineRegionSlugFromValue(value);
  return wineRegionSlugFromValue(value);
}

/**
 * Multi-select OR filter: keep wines whose `wines.region` slug is in `regionSlugs`.
 * Products with NULL region never match a non-empty filter (but stay on unfiltered PLP).
 */
export function filterProductsByRegions(
  products: Product[],
  regionSlugs: string[],
): Product[] {
  if (!regionSlugs?.length) return products;
  const wanted = new Set(
    regionSlugs
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is WineRegionSlug => isWineRegionSlug(s)),
  );
  if (wanted.size === 0) return products;

  return products.filter((product) => {
    const slug = getProductWineRegionSlug(product);
    return slug != null && wanted.has(slug);
  });
}

export function productMatchesRegionFilter(
  product: Pick<Product, "region">,
  regionSlug: string,
): boolean {
  const region = wineRegionBySlug(regionSlug.trim().toLowerCase());
  if (!region) return false;
  return getProductWineRegionSlug(product) === region.slug;
}
