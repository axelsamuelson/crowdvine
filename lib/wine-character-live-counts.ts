import { unstable_cache } from "next/cache";

import { SHOP_PRODUCTS_CACHE_TAG } from "@/lib/crowdvine/revalidate-wine-storefront";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  WINE_CHARACTER_FILTER_VALUES,
  WINE_CHARACTER_INDEX_MIN_LIVE,
  characterValuesForTasteTags,
  type WineCharacterFilterValue,
} from "@/lib/wine-character-tags";

/**
 * Live wine counts by character filter value.
 * Same gate as fetchProductsData: wines.is_live ∧ producers.is_live.
 * A wine with both structured and complex counts once under Komplext.
 */
async function fetchLiveWineCharacterCountsUncached(): Promise<
  Map<WineCharacterFilterValue, number>
> {
  const counts = new Map<WineCharacterFilterValue, number>(
    WINE_CHARACTER_FILTER_VALUES.map((value) => [value, 0]),
  );

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select("tags, producers!inner(is_live)")
    .eq("is_live", true)
    .eq("producers.is_live", true);

  const rows = error
    ? (
        await sb
          .from("wines")
          .select("tags, producers!inner(is_live)")
          .eq("is_live", true)
      ).data
    : data;

  if (!rows) return counts;

  for (const row of rows) {
    const producers = row.producers as
      | { is_live?: boolean | null }
      | { is_live?: boolean | null }[]
      | null;
    const producer = Array.isArray(producers) ? producers[0] : producers;
    if (producer?.is_live === false) continue;

    const tags = Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    for (const value of characterValuesForTasteTags(tags)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return counts;
}

export const getLiveWineCharacterCounts = unstable_cache(
  async () => {
    const map = await fetchLiveWineCharacterCountsUncached();
    return Object.fromEntries(map) as Record<string, number>;
  },
  ["live-wine-character-counts", "v1"],
  { revalidate: 300, tags: [SHOP_PRODUCTS_CACHE_TAG] },
);

export async function getLiveWineCharacterCountsMap(): Promise<
  Map<string, number>
> {
  const record = await getLiveWineCharacterCounts();
  return new Map(Object.entries(record));
}

/** True when a character PLP should be noindex,follow (under the sitemap minimum). */
export async function isWineCharacterBelowIndexMinimum(
  value: WineCharacterFilterValue,
): Promise<boolean> {
  try {
    const counts = await getLiveWineCharacterCountsMap();
    return (counts.get(value) ?? 0) < WINE_CHARACTER_INDEX_MIN_LIVE;
  } catch {
    return true;
  }
}
