import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import {
  ADMIN_STALE_CRAWLING_MS,
  CRON_CRAWL_BATCH_SIZE,
  crawlSingleRestaurant,
  runBatchedCrawlSession,
  runCrawlForSlugs,
} from "@/lib/menu-extraction/crawler";

export const maxDuration = 300;

/**
 * POST /api/admin/menu-extraction/crawl
 * Body: { city?: 'stockholm', slug?: string, slugs?: string[] }
 * - slug: crawl single restaurant.
 * - slugs: crawl only these slugs (e.g. smoke test).
 * - else: batched crawl (same as cron – 3 sources, fits serverless timeout).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const city = (body.city ?? "stockholm") as string;
    const slug = typeof body.slug === "string" ? body.slug.trim() : undefined;
    const slugs = Array.isArray(body.slugs)
      ? (body.slugs as string[]).map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
      : undefined;

    if (slug) {
      const result = await crawlSingleRestaurant(slug);
      return NextResponse.json({
        summary: {
          total_found: 1,
          new_pdfs: result.document_id ? 1 : 0,
          updated_pdfs: result.skipped && result.skip_reason === "no_update" ? 1 : 0,
          skipped: result.skipped ? 1 : 0,
          failed: result.error ? 1 : 0,
          rate_limit_429: result.rate_limit_429 ?? false,
          document_ids: result.document_id ? [result.document_id] : [],
        },
        result,
      });
    }

    if (slugs && slugs.length > 0) {
      const summary = await runCrawlForSlugs(slugs);
      return NextResponse.json({ summary });
    }

    const summary = await runBatchedCrawlSession(
      city === "stockholm" ? "stockholm" : "stockholm",
      false,
      CRON_CRAWL_BATCH_SIZE,
      ADMIN_STALE_CRAWLING_MS,
    );
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
