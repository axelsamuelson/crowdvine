import { unstable_cache } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  AvailabilityState,
  SystembolagetGuideWine,
} from "@/lib/systembolaget/guide-wines";

/** Cache tag busted when a weekly recommendations issue is published/unpublished. */
export const SB_RECOMMENDATION_WINES_CACHE_TAG = "sb-recommendation-wines";

/** Paths that render the latest published recommendations issue. */
export const SYSTEMBOLAGET_RELEASES_PATHS = {
  sv: "/guider/nya-naturviner-systembolaget",
  en: "/guides/new-natural-wines-systembolaget",
} as const;

export type RecommendationIssueWine = SystembolagetGuideWine & {
  issue_year: number;
  issue_week: number;
  published_at: string | null;
};

export type LatestRecommendationIssue = {
  issueYear: number;
  issueWeek: number;
  publishedAt: string | null;
  wines: RecommendationIssueWine[];
};

type RecommendationWineRow = {
  id: number;
  issue_year: number;
  issue_week: number;
  product_number: string;
  editorial_note_sv: string;
  editorial_note_en: string | null;
  sort_order: number;
  published_at: string | null;
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
  product_launch_date: string | null;
};

function mapRow(row: RecommendationWineRow): RecommendationIssueWine {
  return {
    id: row.id,
    product_number: row.product_number,
    verdict: "recommended",
    category: "new",
    editorial_note_sv: row.editorial_note_sv,
    editorial_note_en: row.editorial_note_en,
    producer_note_sv: null,
    producer_note_en: null,
    top_100_producer_name: null,
    sort_order: row.sort_order,
    previous_sort_order: null,
    previous_rank: undefined,
    first_published_at: row.published_at,
    last_reviewed_at: null,
    rank_status: "new",
    rank_delta: null,
    name_bold: row.name_bold,
    name_thin: row.name_thin,
    producer_name: row.producer_name,
    category_level_2: row.category_level_2,
    country: row.country,
    origin_level_1: row.origin_level_1,
    vintage: row.vintage,
    price: row.price,
    volume: row.volume,
    alcohol_percentage: row.alcohol_percentage,
    grapes: row.grapes,
    assortment_text: row.assortment_text,
    is_organic: row.is_organic,
    image_url: row.image_url,
    synced_at: row.synced_at,
    availability_state: row.availability_state,
    store_count: row.store_count,
    wine_score: null,
    score_adjust: 0,
    product_launch_date: row.product_launch_date,
    issue_year: row.issue_year,
    issue_week: row.issue_week,
    published_at: row.published_at,
  };
}

async function fetchLatestRecommendationIssueUncached(): Promise<LatestRecommendationIssue | null> {
  const sb = getSupabaseAdmin();

  // Latest published issue by ISO week (year, then week). Multiple issues may
  // remain is_published=true; the public calendar shows only the newest.
  const { data: latestRows, error: latestError } = await sb
    .from("systembolaget_recommendations")
    .select("issue_year, issue_week, published_at")
    .eq("is_published", true)
    .order("issue_year", { ascending: false })
    .order("issue_week", { ascending: false })
    .limit(1);

  if (latestError) {
    console.error("[getLatestRecommendationIssue]", latestError.message);
    return null;
  }

  const latest = latestRows?.[0];
  if (!latest) return null;

  const issueYear = Number(latest.issue_year);
  const issueWeek = Number(latest.issue_week);

  const columns = [
    "id",
    "issue_year",
    "issue_week",
    "product_number",
    "editorial_note_sv",
    "editorial_note_en",
    "sort_order",
    "published_at",
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
    "product_launch_date",
  ];

  const run = (cols: string[]) =>
    sb
      .from("systembolaget_recommendation_wines")
      .select(cols.join(", "))
      .eq("issue_year", issueYear)
      .eq("issue_week", issueWeek)
      .order("sort_order", { ascending: true });

  let { data, error } = await run(columns);

  // Migration 244 may not be applied yet — retry without launch date.
  if (error && /product_launch_date/i.test(error.message)) {
    const fallbackCols = columns.filter((c) => c !== "product_launch_date");
    ({ data, error } = await run(fallbackCols));
    if (!error && data) {
      data = (data as unknown as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        product_launch_date: null,
      })) as unknown as typeof data;
    }
  }

  if (error) {
    console.error("[getLatestRecommendationIssue] wines", error.message);
    return null;
  }

  const wines = ((data ?? []) as unknown as RecommendationWineRow[]).map(mapRow);
  const publishedAt =
    wines.find((wine) => wine.published_at)?.published_at ??
    (typeof latest.published_at === "string" ? latest.published_at : null);

  return {
    issueYear,
    issueWeek,
    publishedAt,
    wines,
  };
}

/**
 * Latest published weekly recommendations issue for the release calendar.
 * Cached 5 minutes; publish path busts the tag immediately.
 */
export async function getLatestRecommendationIssue(): Promise<LatestRecommendationIssue | null> {
  return unstable_cache(
    () => fetchLatestRecommendationIssueUncached(),
    ["systembolaget-recommendation-wines-latest"],
    {
      revalidate: 300,
      tags: [SB_RECOMMENDATION_WINES_CACHE_TAG],
    },
  )();
}
