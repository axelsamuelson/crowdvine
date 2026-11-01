import { unstable_cache } from "next/cache";

import { getCrowdvineProductByHandle } from "@/lib/crowdvine/product-by-handle-data";
import { PDP_REVALIDATE_SECONDS } from "@/lib/crowdvine/pdp-static-params";
import {
  PDP_PRODUCT_CACHE_TAG,
  pdpProductHandleTag,
} from "@/lib/crowdvine/revalidate-wine-storefront";
import { isB2BHost } from "@/lib/b2b-site";
import type { AppLocale } from "@/lib/i18n/locale";
import type { Product } from "@/lib/shopify/types";

export async function fetchCachedProductForLocale(
  handle: string,
  locale: AppLocale,
  host: string | null,
): Promise<Product | null> {
  const fetchProduct = () =>
    getCrowdvineProductByHandle({ handle, locale, host });

  // Skip persistent cache in dev so PDP mapping/metadata changes show immediately.
  if (process.env.NODE_ENV === "development") {
    return fetchProduct();
  }

  const isB2BSite = isB2BHost(host);
  const cacheKey = isB2BSite ? "b2b" : "b2c";

  // Bump cache key when B2B shipping math changes — Vercel Data Cache persists
  // across deployments, so tag-only fixes stay stale until this key changes.
  return unstable_cache(
    fetchProduct,
    ["pdp-product", "v2-full-pallet-shipping", handle, locale, cacheKey],
    {
      revalidate: PDP_REVALIDATE_SECONDS,
      tags: [PDP_PRODUCT_CACHE_TAG, pdpProductHandleTag(handle)],
    },
  )();
}
