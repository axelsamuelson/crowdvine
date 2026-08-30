import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type GuideWineCategory =
  | "red"
  | "white"
  | "orange"
  | "sparkling"
  | "rose"
  | "budget";

export type GuideWineVerdict = "recommended" | "avoid";

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
