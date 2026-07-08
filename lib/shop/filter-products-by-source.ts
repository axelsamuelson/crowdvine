import type { Product } from "@/lib/shopify/types";

export function filterProductsBySource(
  products: Product[],
  sourceSlugs: string[],
  wineSourceSlugs: Record<string, string[]>,
): Product[] {
  if (!sourceSlugs || sourceSlugs.length === 0 || !wineSourceSlugs) return products;
  const wanted = new Set(sourceSlugs);
  return products.filter((product) => {
    const slugs = wineSourceSlugs[product.id];
    if (!slugs || slugs.length === 0) return false;
    return slugs.some((s) => wanted.has(s));
  });
}
