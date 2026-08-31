import { unstable_cache } from "next/cache";
import { headers } from "next/headers";

import { getCrowdvineProductByHandle } from "@/lib/crowdvine/product-by-handle-data";
import { PDP_REVALIDATE_SECONDS } from "@/lib/crowdvine/pdp-static-params";
import {
  PDP_PRODUCT_CACHE_TAG,
  pdpProductHandleTag,
} from "@/lib/crowdvine/revalidate-wine-storefront";
import { isB2BHost } from "@/lib/b2b-site";
import type { AppLocale } from "@/lib/i18n/locale";
import type { Product } from "@/lib/shopify/types";

export async function getPdpRequestHost(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

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

  return unstable_cache(fetchProduct, ["pdp-product", handle, locale, cacheKey], {
    revalidate: PDP_REVALIDATE_SECONDS,
    tags: [PDP_PRODUCT_CACHE_TAG, pdpProductHandleTag(handle)],
  })();
}
