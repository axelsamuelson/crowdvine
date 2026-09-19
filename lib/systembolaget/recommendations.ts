import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  systembolagetProductUrl,
  type SystembolagetGuideWine,
} from "@/lib/systembolaget/guide-wines";

/** Row shape from systembolaget_recommendation_wines (published only). */
export type SystembolagetRecommendationWine = {
  id: number;
  issue_year: number;
  issue_week: number;
  product_number: string;
  editorial_note_sv: string;
  editorial_note_en: string | null;
  sort_order: number;
  published_at: string;
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
  synced_at: string | null;
};

export type RecommendationIssueSummary = {
  year: number;
  week: number;
  published_at: string;
  wineCount: number;
};

export type RecommendationIssue = {
  year: number;
  week: number;
  published_at: string;
  wines: SystembolagetRecommendationWine[];
};

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
].join(", ");

export function recommendationIssuePath(
  year: number,
  week: number,
  locale: "en" | "sv",
): string {
  if (locale === "sv") {
    return `/guider/rekommenderade-naturviner-v${week}-${year}`;
  }
  return `/guides/recommended-natural-wines-w${week}-${year}`;
}

export function recommendationIndexPath(locale: "en" | "sv"): string {
  return locale === "sv"
    ? "/guider/rekommenderade-naturviner"
    : "/guides/recommended-natural-wines";
}

export function parseRecommendationIssueSlug(
  slug: string,
): { year: number; week: number } | null {
  const match = /^(\d{1,2})-(\d{4})$/.exec(slug.trim());
  if (!match) return null;
  const week = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[2], 10);
  if (!Number.isFinite(week) || !Number.isFinite(year)) return null;
  if (week < 1 || week > 53) return null;
  if (year < 2000 || year > 2100) return null;
  return { year, week };
}

export function recommendationWineDisplayName(
  wine: Pick<
    SystembolagetRecommendationWine,
    "producer_name" | "name_bold" | "name_thin"
  >,
): string {
  const producer = wine.producer_name?.trim() || "Unknown producer";
  const name = [wine.name_bold, wine.name_thin]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name ? `${producer} — ${name}` : producer;
}

export function recommendationWineMetaLine(
  wine: SystembolagetRecommendationWine,
): string {
  const price =
    wine.price !== null && wine.price !== undefined
      ? `${wine.price} kr`
      : null;
  const grapes =
    wine.grapes && wine.grapes.length > 0 ? wine.grapes.join(", ") : null;
  const origin = [wine.origin_level_1, wine.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
  return [price, wine.assortment_text, grapes, origin || null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/**
 * Map a weekly recommendation row into the ranked-list wine shape so we can
 * reuse RankedWineRow (bottle image, rank badge, assortment, SB link).
 * Rank movement fields are null — weekly issues are not a standing ladder.
 */
export function recommendationWineAsGuideWine(
  wine: SystembolagetRecommendationWine,
): SystembolagetGuideWine {
  return {
    id: wine.id,
    product_number: wine.product_number,
    verdict: "recommended",
    category: "red",
    editorial_note_sv: wine.editorial_note_sv,
    editorial_note_en: wine.editorial_note_en,
    producer_note_sv: null,
    producer_note_en: null,
    top_100_producer_name: null,
    sort_order: wine.sort_order,
    previous_sort_order: null,
    first_published_at: null,
    last_reviewed_at: null,
    rank_status: "unchanged",
    rank_delta: null,
    name_bold: wine.name_bold,
    name_thin: wine.name_thin,
    producer_name: wine.producer_name,
    category_level_2: wine.category_level_2,
    country: wine.country,
    origin_level_1: wine.origin_level_1,
    vintage: wine.vintage,
    price: wine.price,
    volume: wine.volume,
    alcohol_percentage: wine.alcohol_percentage,
    grapes: wine.grapes,
    assortment_text: wine.assortment_text,
    is_organic: wine.is_organic,
    image_url: wine.image_url,
    synced_at: wine.synced_at ?? "",
  };
}

export { systembolagetProductUrl };

/**
 * Published wines for a single weekly issue, ordered by sort_order.
 */
export async function getRecommendationIssue(
  year: number,
  week: number,
): Promise<SystembolagetRecommendationWine[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_recommendation_wines")
    .select(RECOMMENDATION_WINE_COLUMNS)
    .eq("issue_year", year)
    .eq("issue_week", week)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getRecommendationIssue]", error.message);
    return [];
  }

  return (data ?? []) as SystembolagetRecommendationWine[];
}

/**
 * Newest published issue (by year, then week), with its wines.
 */
export async function getLatestIssue(): Promise<RecommendationIssue | null> {
  const issues = await listIssues();
  const latest = issues[0];
  if (!latest) return null;

  const wines = await getRecommendationIssue(latest.year, latest.week);
  if (wines.length === 0) return null;

  return {
    year: latest.year,
    week: latest.week,
    published_at: latest.published_at,
    wines,
  };
}

/**
 * All published issues, newest first (for the index page).
 */
export async function listIssues(): Promise<RecommendationIssueSummary[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_recommendation_wines")
    .select("issue_year, issue_week, published_at")
    .order("issue_year", { ascending: false })
    .order("issue_week", { ascending: false });

  if (error) {
    console.error("[listIssues]", error.message);
    return [];
  }

  const byKey = new Map<string, RecommendationIssueSummary>();
  for (const row of data ?? []) {
    const year = row.issue_year as number;
    const week = row.issue_week as number;
    const publishedAt = row.published_at as string;
    const key = `${year}-${week}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.wineCount += 1;
      if (publishedAt > existing.published_at) {
        existing.published_at = publishedAt;
      }
    } else {
      byKey.set(key, {
        year,
        week,
        published_at: publishedAt,
        wineCount: 1,
      });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });
}
