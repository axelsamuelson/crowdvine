import { unstable_cache } from "next/cache";

import { SHOP_PRODUCTS_CACHE_TAG } from "@/lib/crowdvine/revalidate-wine-storefront";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  countLiveWinesByRegionValue,
  isWineRegionValue,
  WINE_REGION_INDEX_MIN_LIVE,
  type WineRegionValue,
} from "@/lib/wine-regions";

/**
 * Live wine counts by canonical `wines.region` value.
 * Same gate as `fetchProductsData`: wines.is_live ∧ producers.is_live.
 */
async function fetchLiveWineRegionCountsUncached(): Promise<
  Map<WineRegionValue, number>
> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select("region, producers!inner(is_live)")
    .eq("is_live", true)
    .eq("producers.is_live", true)
    .not("region", "is", null);

  if (error) {
    const fallback = await sb
      .from("wines")
      .select("region, producers!inner(is_live)")
      .eq("is_live", true)
      .not("region", "is", null);
    if (fallback.error) return new Map();
    return countLiveWinesByRegionValue(
      (fallback.data ?? []).filter((row) => {
        const producers = row.producers as
          | { is_live?: boolean | null }
          | { is_live?: boolean | null }[]
          | null;
        const producer = Array.isArray(producers) ? producers[0] : producers;
        return producer?.is_live !== false && isWineRegionValue(row.region);
      }),
    );
  }

  return countLiveWinesByRegionValue(
    (data ?? []).filter((row) => isWineRegionValue(row.region)),
  );
}

/** Cached live counts — busts with shop product cache tag. */
export const getLiveWineRegionCounts = unstable_cache(
  async () => {
    const map = await fetchLiveWineRegionCountsUncached();
    return Object.fromEntries(map) as Record<string, number>;
  },
  ["live-wine-region-counts", "v1"],
  { revalidate: 300, tags: [SHOP_PRODUCTS_CACHE_TAG] },
);

export async function getLiveWineRegionCountsMap(): Promise<
  Map<string, number>
> {
  const record = await getLiveWineRegionCounts();
  return new Map(Object.entries(record));
}

/** True when a region PLP should be noindex,follow (under the sitemap minimum). */
export async function isWineRegionBelowIndexMinimum(
  wineRegionValue: string,
): Promise<boolean> {
  try {
    const counts = await getLiveWineRegionCountsMap();
    return (counts.get(wineRegionValue) ?? 0) < WINE_REGION_INDEX_MIN_LIVE;
  } catch {
    return true;
  }
}
