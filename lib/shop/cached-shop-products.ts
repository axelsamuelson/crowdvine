import { unstable_cache } from "next/cache";

import { fetchProductsData } from "@/lib/crowdvine/products-data";
import type { ProductSortKey } from "@/lib/shopify/types";

type CachedShopProductsParams = {
  sortKey: ProductSortKey;
  reverse: boolean;
  isB2BSite: boolean;
  displayCurrencyCode: string;
  sekToDisplayRate: number;
};

export const getCachedShopProducts = unstable_cache(
  async (params: CachedShopProductsParams) => {
    return fetchProductsData({
      sortKey: params.sortKey,
      reverse: params.reverse,
      isB2BSite: params.isB2BSite,
      displayCurrencyCode: params.displayCurrencyCode,
      sekToDisplayRate: params.sekToDisplayRate,
    });
  },
  ["shop-root-products"],
  { revalidate: 300, tags: ["shop-products"] },
);
