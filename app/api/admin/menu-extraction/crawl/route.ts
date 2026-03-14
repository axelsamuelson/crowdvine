import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { runCrawlSession, runCrawlForSlugs, crawlSingleRestaurant } from "@/lib/menu-extraction/crawler";

/**
 * POST /api/admin/menu-extraction/crawl
 * Body: { city?: 'stockholm', slug?: string, slugs?: string[] }
 * - slug: crawl single restaurant.
 * - slugs: crawl only these slugs (e.g. smoke test).
 * - else: run full runCrawlSession(city).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const usePlaywright = process.env.BROWSER_ADAPTER?.trim().toLowerCase() === "playwright";
    if (
      !usePlaywright &&
      !process.env.BROWSERLESS_API_KEY?.trim() &&
      process.env.USE_LOCAL_FETCH !== "true"
    ) {
      return NextResponse.json({
        summary: null,
        skipped: true,
        reason: "missing_browserless_key",
      });
    }
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

    const summary = await runCrawlSession(
      city === "stockholm" ? "stockholm" : "stockholm"
    );
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
