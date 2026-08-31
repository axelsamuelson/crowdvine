import { revalidatePath, revalidateTag } from "next/cache";

/** Shared tag for all PDP product payloads (unstable_cache). */
export const PDP_PRODUCT_CACHE_TAG = "pdp-product";

/** Shared tag for shop listing product payloads. */
export const SHOP_PRODUCTS_CACHE_TAG = "shop-products";

export function pdpProductHandleTag(handle: string): string {
  return `pdp-product:${handle}`;
}

/**
 * Bust storefront caches after live wine price/catalog changes.
 * Safe to call from Route Handlers and Server Actions.
 */
export function revalidateWineStorefrontCaches(handles: string[]): void {
  // "max" = expire immediately (Next.js 16 revalidateTag profile).
  revalidateTag(SHOP_PRODUCTS_CACHE_TAG, "max");
  revalidateTag(PDP_PRODUCT_CACHE_TAG, "max");

  const unique = [
    ...new Set(
      handles
        .map((h) => String(h || "").trim())
        .filter((h) => h.length > 0),
    ),
  ];

  for (const handle of unique) {
    revalidateTag(pdpProductHandleTag(handle), "max");
    revalidatePath(`/product/${handle}`);
    revalidatePath(`/produkt/${handle}`);
  }

  revalidatePath("/");
  revalidatePath("/vin");
  revalidatePath("/wine");
}
