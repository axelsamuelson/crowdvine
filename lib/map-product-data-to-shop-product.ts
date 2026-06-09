import type { ProductData } from "@/lib/crowdvine/products-data";
import type { Product } from "@/lib/shopify/types";

/** ProductData from fetchProductsData matches Product; ensure required descriptionHtml. */
export function mapProductDataToShopProducts(items: ProductData[]): Product[] {
  return items.map((item) => ({
    ...item,
    descriptionHtml: item.descriptionHtml ?? `<p>${item.description}</p>`,
  }));
}
