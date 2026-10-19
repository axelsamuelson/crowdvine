import { unstable_cache } from "next/cache";

import { fetchProductsData } from "@/lib/crowdvine/products-data";
import { SHOP_PRODUCTS_CACHE_TAG } from "@/lib/crowdvine/revalidate-wine-storefront";
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
  // Keep in sync with PDP shipping-fix cache bumps (Data Cache survives deploys).
  ["shop-root-products", "v2-full-pallet-shipping"],
  { revalidate: 300, tags: [SHOP_PRODUCTS_CACHE_TAG] },
);
