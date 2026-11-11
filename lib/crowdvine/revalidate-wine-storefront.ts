import { revalidatePath, revalidateTag } from "next/cache";

import { generateProducerSlug } from "@/lib/producer-handle";
import {
  isWineRegionSlug,
  wineRegionPagePath,
  wineRegionSlugFromValue,
  type WineRegionSlug,
} from "@/lib/wine-regions";

/** Shared tag for all PDP product payloads (unstable_cache). */
export const PDP_PRODUCT_CACHE_TAG = "pdp-product";

/** Shared tag for shop listing product payloads. */
export const SHOP_PRODUCTS_CACHE_TAG = "shop-products";

export function pdpProductHandleTag(handle: string): string {
  return `pdp-product:${handle}`;
}

function resolveRegionSlug(
  raw: string | null | undefined,
): WineRegionSlug | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (isWineRegionSlug(trimmed.toLowerCase())) {
    return trimmed.toLowerCase() as WineRegionSlug;
  }
  return wineRegionSlugFromValue(trimmed);
}

export type RevalidateWineStorefrontOptions = {
  /** Producer display names whose public profile + shop PLP paths should be busted. */
  producerNames?: Array<string | null | undefined>;
  /**
   * Canonical wine region values or slugs whose `/region` + `/regions` pages
   * should be busted (linkability updates when stock goes live).
   */
  wineRegions?: Array<string | null | undefined>;
};

/**
 * Bust storefront caches after live wine price/catalog changes.
 * Safe to call from Route Handlers and Server Actions.
 */
export function revalidateWineStorefrontCaches(
  handles: string[],
  options?: RevalidateWineStorefrontOptions,
): void {
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

  const producerSlugs = [
    ...new Set(
      (options?.producerNames ?? [])
        .map((name) =>
          typeof name === "string" && name.trim()
            ? generateProducerSlug(name)
            : "",
        )
        .filter((slug) => slug.length > 0),
    ),
  ];

  for (const slug of producerSlugs) {
    revalidatePath(`/producenter/${slug}`);
    revalidatePath(`/producers/${slug}`);
    revalidatePath(`/vin/${slug}`);
    revalidatePath(`/wine/${slug}`);
  }

  const regionSlugs = [
    ...new Set(
      (options?.wineRegions ?? [])
        .map((value) => resolveRegionSlug(value))
        .filter((slug): slug is WineRegionSlug => slug != null),
    ),
  ];

  for (const slug of regionSlugs) {
    revalidatePath(wineRegionPagePath(slug, "sv"));
    revalidatePath(wineRegionPagePath(slug, "en"));
  }

  revalidatePath("/");
  revalidatePath("/vin");
  revalidatePath("/wine");
  revalidatePath("/vin/lattdruckna-naturviner");
  revalidatePath("/wine/easy-drinking-natural-wine");
}
