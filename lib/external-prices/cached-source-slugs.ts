import { unstable_cache } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const APPROVED_MATCH_THRESHOLD = 0.4;

async function fetchAllWineSourceSlugs(): Promise<Record<string, string[]>> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("external_offers")
    .select("wine_id, price_sources(slug)")
    .gte("match_confidence", APPROVED_MATCH_THRESHOLD);

  if (error) {
    console.warn("[cached-source-slugs]", error.message);
    return {};
  }

  const rows = (data ?? []) as {
    wine_id: string;
    price_sources: { slug: string } | null;
  }[];

  const out: Record<string, string[]> = {};
  for (const row of rows) {
    const slug = row.price_sources?.slug;
    if (!slug) continue;
    if (!out[row.wine_id]) out[row.wine_id] = [];
    if (!out[row.wine_id].includes(slug)) out[row.wine_id].push(slug);
  }
  return out;
}

export const getCachedAllWineSourceSlugs = unstable_cache(
  fetchAllWineSourceSlugs,
  ["all-wine-source-slugs"],
  { revalidate: 300 },
);

export function pickWineSourceSlugsForProducts(
  allSlugs: Record<string, string[]>,
  wineIds: string[],
): Record<string, string[]> {
  if (wineIds.length === 0) return {};
  const out: Record<string, string[]> = {};
  for (const id of wineIds) {
    const slugs = allSlugs[id];
    if (slugs?.length) out[id] = slugs;
  }
  return out;
}
