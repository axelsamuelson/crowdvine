import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type GuideWineCategory =
  | "red"
  | "white"
  | "orange"
  | "sparkling"
  | "rose"
  | "budget";

export type GuideWineVerdict = "recommended" | "avoid";

export type GuideWineRankStatus = "new" | "up" | "down" | "unchanged";

/** Row shape from systembolaget_guide_wines. */
export type SystembolagetGuideWine = {
  id: number;
  product_number: string;
  verdict: GuideWineVerdict;
  category: GuideWineCategory;
  editorial_note_sv: string;
  editorial_note_en: string | null;
  producer_note_sv: string | null;
  producer_note_en: string | null;
  sort_order: number;
  previous_sort_order: number | null;
  first_published_at: string | null;
  last_reviewed_at: string | null;
  rank_status: GuideWineRankStatus;
  rank_delta: number | null;
  name_bold: string | null;
  name_thin: string | null;
  producer_name: string | null;
  category_level_2: string | null;
  country: string | null;
  origin_level_1: string | null;
  vintage: number | null;
  price: number | null;
  volume: number | null;
  alcohol_percentage: number | null;
  grapes: string[] | null;
  assortment_text: string | null;
  is_organic: boolean | null;
  image_url: string | null;
  synced_at: string;
};

export function systembolagetProductUrl(productNumber: string): string {
  return `https://www.systembolaget.se/produkt/vin/${productNumber}/`;
}

/**
 * Build a renderable Systembolaget bottle image URL.
 *
 * `image_url` from the API / `systembolaget_guide_wines` is a bare CDN path
 * (no extension). That bare URL **404s**. The CDN only serves sized assets as
 * `{id}_{size}.png` (100 | 200 | 400). Do not "simplify" this back to the bare
 * path or to query params — both fail.
 */
export function systembolagetImageUrl(
  baseUrl: string | null,
  size: 100 | 200 | 400 = 200,
): string | null {
  if (!baseUrl) return null;
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!base) return null;
  // Already a sized/derived asset — leave alone.
  if (/_\d+\.(png|jpe?g)(\?|$)/i.test(base)) return base;
  if (/\.(png|jpe?g|webp)(\?|$)/i.test(base)) return base;
  return `${base}_${size}.png`;
}


/**
 * Subtle rank movement label for list headings.
 * unchanged → null (render nothing).
 */
export function formatRankBadge(
  wine: Pick<SystembolagetGuideWine, "rank_status" | "rank_delta">,
  locale: "en" | "sv",
): string | null {
  switch (wine.rank_status) {
    case "new":
      return locale === "sv" ? "Ny" : "New";
    case "up": {
      const delta =
        wine.rank_delta !== null && wine.rank_delta !== undefined
          ? Math.abs(wine.rank_delta)
          : null;
      return delta !== null ? `↑ ${delta}` : "↑";
    }
    case "down": {
      const delta =
        wine.rank_delta !== null && wine.rank_delta !== undefined
          ? Math.abs(wine.rank_delta)
          : null;
      return delta !== null ? `↓ ${delta}` : "↓";
    }
    case "unchanged":
    default:
      return null;
  }
}

/**
 * Freshest synced_at across guide wine rows (for "Sortimentsdata uppdaterad …").
 */
export function freshestSyncedAt(
  wines: ReadonlyArray<Pick<SystembolagetGuideWine, "synced_at">>,
): string | null {
  let best: string | null = null;
  for (const wine of wines) {
    if (!wine.synced_at) continue;
    if (!best || wine.synced_at > best) best = wine.synced_at;
  }
  return best;
}

/**
 * Published + available curated wines for a guide category.
 * Server-side only (uses service role for consistent reads).
 */
export async function getGuideWines(
  category: GuideWineCategory,
  verdict: GuideWineVerdict = "recommended",
): Promise<SystembolagetGuideWine[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_guide_wines")
    .select(
      [
        "id",
        "product_number",
        "verdict",
        "category",
        "editorial_note_sv",
        "editorial_note_en",
        "producer_note_sv",
        "producer_note_en",
        "sort_order",
        "previous_sort_order",
        "first_published_at",
        "last_reviewed_at",
        "rank_status",
        "rank_delta",
        "name_bold",
        "name_thin",
        "producer_name",
        "category_level_2",
        "country",
        "origin_level_1",
        "vintage",
        "price",
        "volume",
        "alcohol_percentage",
        "grapes",
        "assortment_text",
        "is_organic",
        "image_url",
        "synced_at",
      ].join(", "),
    )
    .eq("category", category)
    .eq("verdict", verdict)
    .order("sort_order", { ascending: true })
    .order("price", { ascending: true });

  if (error) {
    console.error("[getGuideWines]", error.message);
    return [];
  }

  return (data ?? []) as SystembolagetGuideWine[];
}

export function formatSyncedAtLabel(
  syncedAt: string | null,
  locale: "en" | "sv",
): string | null {
  if (!syncedAt) return null;
  const date = new Date(syncedAt);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return locale === "sv"
    ? `Sortimentsdata uppdaterad ${formatted}`
    : `Assortment data updated ${formatted}`;
}
