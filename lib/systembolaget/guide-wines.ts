import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { unstable_cache } from "next/cache";
import { orderCategoryWines } from "@/lib/systembolaget/ranking";
import type { GuideWineCategory } from "@/lib/systembolaget/guide-wine-categories";

export {
  GUIDE_WINE_CATEGORIES,
  SYSTEMBOLAGET_PRODUCT_SEARCH_CATEGORIES,
  type GuideWineCategory,
} from "@/lib/systembolaget/guide-wine-categories";

/** Colour, sparkling and budget styles shown on the parent list. Glou-glou and pet nat are not style labels. */
export const PRIMARY_STYLE_CATEGORIES = [
  "red",
  "orange",
  "white",
  "rose",
  "sparkling",
  "budget",
] as const satisfies readonly GuideWineCategory[];

export type PrimaryStyleCategory = (typeof PRIMARY_STYLE_CATEGORIES)[number];

const PRIMARY_STYLE_LABELS: Record<
  PrimaryStyleCategory,
  { en: string; sv: string }
> = {
  red: { sv: "Rött", en: "Red" },
  orange: { sv: "Orange", en: "Orange" },
  white: { sv: "Vitt", en: "White" },
  rose: { sv: "Rosé", en: "Rosé" },
  sparkling: { sv: "Mousserande", en: "Sparkling" },
  budget: { sv: "Budget", en: "Budget" },
};

/**
 * When a product sits on more than one non-best list, prefer the style
 * in PRIMARY_STYLE_CATEGORIES order. Glou-glou and pet nat never become the label.
 */
export function pickPrimaryStyleCategory(
  categories: readonly string[],
): PrimaryStyleCategory | null {
  for (const style of PRIMARY_STYLE_CATEGORIES) {
    if (categories.includes(style)) return style;
  }
  return null;
}

export function primaryStyleLabel(
  category: string | null | undefined,
  locale: "en" | "sv",
): string | null {
  if (!category) return null;
  if (!(PRIMARY_STYLE_CATEGORIES as readonly string[]).includes(category)) {
    return null;
  }
  return PRIMARY_STYLE_LABELS[category as PrimaryStyleCategory][locale];
}

export type GuideWineVerdict = "recommended" | "avoid";

export type GuideWineRankStatus = "new" | "up" | "down" | "unchanged";

export type AvailabilityState = "available" | "limited" | "unavailable";

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
  /** Exact TOP_100_PRODUCERS.name for {{rank}} resolution; null if not linked. */
  top_100_producer_name: string | null;
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
  availability_state: AvailabilityState;
  store_count: number | null;
  /** Editorial 0..100 score. Null keeps today's sort_order. */
  wine_score: number | null;
  score_adjust: number;
  /** Systembolaget launch instant. Null when the product has no launch date. */
  product_launch_date: string | null;
  /** Set on the parent "best" list from the product's non-best curated row. */
  primary_style?: PrimaryStyleCategory | null;
};

/** Label for limited-availability wines; null when not limited. */
export function limitedAvailabilityLabel(
  state: AvailabilityState | string | null | undefined,
  locale: "en" | "sv",
): string | null {
  if (state !== "limited") return null;
  return locale === "sv" ? "Begränsad tillgång" : "Limited availability";
}

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
 * Cached 5 minutes — Systembolaget ranked guides use ISR with the same window.
 */
export async function getGuideWines(
  category: GuideWineCategory,
  verdict: GuideWineVerdict = "recommended",
): Promise<SystembolagetGuideWine[]> {
  return unstable_cache(
    () => fetchGuideWinesUncached(category, verdict),
    ["systembolaget-guide-wines", category, verdict],
    {
      revalidate: 300,
      tags: [`sb-guide-wines-${category}-${verdict}`],
    },
  )();
}

async function fetchGuideWinesUncached(
  category: GuideWineCategory,
  verdict: GuideWineVerdict,
): Promise<SystembolagetGuideWine[]> {
  const sb = getSupabaseAdmin();
  const columns = [
    "id",
    "product_number",
    "verdict",
    "category",
    "editorial_note_sv",
    "editorial_note_en",
    "producer_note_sv",
    "producer_note_en",
    "top_100_producer_name",
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
    "availability_state",
    "store_count",
    "wine_score",
    "score_adjust",
    "product_launch_date",
  ];

  const run = (cols: string[]) =>
    sb
      .from("systembolaget_guide_wines")
      .select(cols.join(", "))
      .eq("category", category)
      .eq("verdict", verdict)
      .order("sort_order", { ascending: true })
      .order("price", { ascending: true });

  let { data, error } = await run(columns);

  // The select string is built at runtime, so PostgREST types the rows as
  // GenericStringError. Cast through unknown when filling missing columns.
  const mergeRows = (
    rows: NonNullable<typeof data>,
    extra: Record<string, string | number | null>,
  ): NonNullable<typeof data> => {
    const list = rows as unknown as Array<Record<string, unknown>>;
    return list.map((row) => ({ ...row, ...extra })) as unknown as NonNullable<
      typeof data
    >;
  };

  // Migration 207 may not be applied yet — retry without the new column.
  if (error && /top_100_producer_name/i.test(error.message)) {
    const fallbackCols = columns.filter((c) => c !== "top_100_producer_name");
    ({ data, error } = await run(fallbackCols));
    if (!error && data) {
      data = mergeRows(data, { top_100_producer_name: null });
    }
  }

  // Migration 211 — availability_state / store_count may be absent locally.
  if (
    error &&
    /availability_state|store_count/i.test(error.message)
  ) {
    const fallbackCols = columns.filter(
      (c) => c !== "availability_state" && c !== "store_count",
    );
    ({ data, error } = await run(fallbackCols));
    if (!error && data) {
      data = mergeRows(data, {
        availability_state: "available",
        store_count: null,
      });
    }
  }

  if (
    error &&
    /wine_score|score_adjust/i.test(error.message)
  ) {
    const fallbackCols = columns.filter(
      (column) => column !== "wine_score" && column !== "score_adjust",
    );
    ({ data, error } = await run(fallbackCols));
    if (!error && data) {
      data = mergeRows(data, { wine_score: null, score_adjust: 0 });
    }
  }

  // Migration 236 — product_launch_date may be absent locally.
  if (error && /product_launch_date/i.test(error.message)) {
    const fallbackCols = columns.filter(
      (column) => column !== "product_launch_date",
    );
    ({ data, error } = await run(fallbackCols));
    if (!error && data) {
      data = mergeRows(data, { product_launch_date: null });
    }
  }

  if (error) {
    console.error("[getGuideWines]", error.message);
    return [];
  }

  const wines = (data ?? []) as unknown as SystembolagetGuideWine[];
  // The release calendar orders by launch date on the page.
  // Recommended ranked lists use categoryRank once any wine_score is set.
  // Avoid lists stay on the sort_order query.
  const ordered =
    verdict === "recommended" && category !== "new"
      ? orderCategoryWines(wines)
      : wines;
  if (category !== "best" || ordered.length === 0) return ordered;
  return attachPrimaryStyles(ordered);
}

async function attachPrimaryStyles(
  wines: SystembolagetGuideWine[],
): Promise<SystembolagetGuideWine[]> {
  const numbers = [...new Set(wines.map((wine) => wine.product_number))];
  if (numbers.length === 0) return wines;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_curated")
    .select("product_number, category")
    .in("product_number", numbers)
    .neq("category", "best")
    .neq("verdict", "skipped");

  if (error || !data) {
    console.error("[getGuideWines] primary style", error?.message);
    return wines;
  }

  const byProduct = new Map<string, string[]>();
  for (const row of data) {
    const productNumber = String(row.product_number);
    const styleCategory = String(row.category);
    const list = byProduct.get(productNumber) ?? [];
    list.push(styleCategory);
    byProduct.set(productNumber, list);
  }

  return wines.map((wine) => ({
    ...wine,
    primary_style: pickPrimaryStyleCategory(
      byProduct.get(wine.product_number) ?? [],
    ),
  }));
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
