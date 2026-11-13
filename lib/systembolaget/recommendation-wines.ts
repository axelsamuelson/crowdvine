import { unstable_cache } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  AvailabilityState,
  SystembolagetGuideWine,
} from "@/lib/systembolaget/guide-wines";

/** Cache tag busted when a weekly recommendations issue is published/unpublished. */
export const SB_RECOMMENDATION_WINES_CACHE_TAG = "sb-recommendation-wines";

/** Paths that render the published recommendations issues. */
export const SYSTEMBOLAGET_RELEASES_PATHS = {
  sv: "/guider/nya-naturviner-systembolaget",
  en: "/guides/new-natural-wines-systembolaget",
} as const;

export type RecommendationIssueWine = SystembolagetGuideWine & {
  issue_year: number;
  issue_week: number;
  published_at: string | null;
};

export type RecommendationIssue = {
  issueYear: number;
  issueWeek: number;
  publishedAt: string | null;
  wines: RecommendationIssueWine[];
};

/** @deprecated Prefer RecommendationIssue — alias kept for call-site clarity. */
export type LatestRecommendationIssue = RecommendationIssue;

export type PublishedRecommendationIssues = {
  /**
   * Newest published issue's `published_at` (not product `synced_at`) for the
   * page "Uppdaterad" / "Updated" line.
   */
  latestPublishedAt: string | null;
  /** Issues with at least one qualifying wine, newest week first. */
  issues: RecommendationIssue[];
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

function issueKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function compareIssueDesc(
  a: { issueYear: number; issueWeek: number },
  b: { issueYear: number; issueWeek: number },
): number {
  if (a.issueYear !== b.issueYear) return b.issueYear - a.issueYear;
  return b.issueWeek - a.issueWeek;
}

/**
 * Group recommendation rows into published issues (newest first). Issues with
 * no wines are omitted — sold-out weeks disappear automatically via the view's
 * availability filter.
 */
export function groupRecommendationIssuesByWeek(
  wines: readonly RecommendationIssueWine[],
): RecommendationIssue[] {
  const byIssue = new Map<string, RecommendationIssueWine[]>();
  for (const wine of wines) {
    const key = issueKey(wine.issue_year, wine.issue_week);
    const list = byIssue.get(key) ?? [];
    list.push(wine);
    byIssue.set(key, list);
  }

  const issues: RecommendationIssue[] = [];
  for (const list of byIssue.values()) {
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.id - b.id;
    });
    const head = sorted[0]!;
    const publishedAt =
      sorted.find((wine) => wine.published_at)?.published_at ?? null;
    issues.push({
      issueYear: head.issue_year,
      issueWeek: head.issue_week,
      publishedAt,
      wines: sorted,
    });
  }

  return issues.sort(compareIssueDesc);
}

/** "Vecka 44" / "Week 44". */
export function formatIssueWeekHeading(
  issueWeek: number,
  locale: "en" | "sv",
): string {
  return locale === "sv" ? `Vecka ${issueWeek}` : `Week ${issueWeek}`;
}

const RECOMMENDATION_WINE_COLUMNS = [
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
] as const;

async function fetchPublishedRecommendationIssuesUncached(): Promise<PublishedRecommendationIssues> {
  const sb = getSupabaseAdmin();

  // Latest published issue metadata for the page updated line (issue date, not
  // product synced_at). May differ from the first listed issue if that week
  // has no remaining available wines.
  const { data: latestRows, error: latestError } = await sb
    .from("systembolaget_recommendations")
    .select("issue_year, issue_week, published_at")
    .eq("is_published", true)
    .order("issue_year", { ascending: false })
    .order("issue_week", { ascending: false })
    .limit(1);

  if (latestError) {
    console.error("[getPublishedRecommendationIssues]", latestError.message);
    return { latestPublishedAt: null, issues: [] };
  }

  const latest = latestRows?.[0];
  const latestPublishedAt =
    typeof latest?.published_at === "string" ? latest.published_at : null;

  const run = (cols: readonly string[]) =>
    sb
      .from("systembolaget_recommendation_wines")
      .select(cols.join(", "))
      .order("issue_year", { ascending: false })
      .order("issue_week", { ascending: false })
      .order("sort_order", { ascending: true });

  let { data, error } = await run(RECOMMENDATION_WINE_COLUMNS);

  // Migration 247 may not be applied yet — retry without launch date.
  if (error && /product_launch_date/i.test(error.message)) {
    const fallbackCols = RECOMMENDATION_WINE_COLUMNS.filter(
      (c) => c !== "product_launch_date",
    );
    ({ data, error } = await run(fallbackCols));
    if (!error && data) {
      data = (data as unknown as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        product_launch_date: null,
      })) as unknown as typeof data;
    }
  }

  if (error) {
    console.error("[getPublishedRecommendationIssues] wines", error.message);
    return { latestPublishedAt, issues: [] };
  }

  const wines = ((data ?? []) as unknown as RecommendationWineRow[]).map(
    mapRow,
  );
  const issues = groupRecommendationIssuesByWeek(wines);

  // Prefer wine-row published_at from the newest listed issue when present;
  // fall back to the recommendations table published_at.
  const latestFromIssues = issues[0]?.publishedAt ?? null;

  return {
    latestPublishedAt: latestFromIssues ?? latestPublishedAt,
    issues,
  };
}

/**
 * All published weekly recommendation issues that still have available/limited
 * wines, newest first. Cached 5 minutes; publish path busts the tag immediately.
 * Page ISR is also `revalidate = 600`.
 */
export async function getPublishedRecommendationIssues(): Promise<PublishedRecommendationIssues> {
  return unstable_cache(
    () => fetchPublishedRecommendationIssuesUncached(),
    ["systembolaget-recommendation-wines-all-issues"],
    {
      revalidate: 300,
      tags: [SB_RECOMMENDATION_WINES_CACHE_TAG],
    },
  )();
}

/**
 * Latest published weekly recommendations issue for the release calendar.
 * @deprecated Prefer getPublishedRecommendationIssues — kept for callers that
 * only need the newest week.
 */
export async function getLatestRecommendationIssue(): Promise<LatestRecommendationIssue | null> {
  const { issues } = await getPublishedRecommendationIssues();
  return issues[0] ?? null;
}
