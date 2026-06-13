import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/menu-extraction/cron-auth";
import { evaluateMenuPipelineAlerts } from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth, listCrawlSourcesForRetry } from "@/lib/menu-extraction/health";
import { updateStarwinelistSource } from "@/lib/menu-extraction/db";
import { crawlSingleRestaurant } from "@/lib/menu-extraction/crawler";

export const maxDuration = 300;

const BATCH = 10;

/**
 * Cron: retry partial / failed / pending Starwinelist crawls.
 * Secured by CRON_SECRET. Schedule: 0 2,8,14,20 * * * (4× daily UTC)
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await listCrawlSourcesForRetry(BATCH);
  const results: Array<{
    slug: string;
    outcome: "completed" | "partial" | "failed" | "skipped";
    document_id?: string;
    error?: string;
  }> = [];

  for (const source of sources) {
    if (source.crawl_attempts >= 5) {
      await updateStarwinelistSource(source.id, { crawl_attempts: 0 });
    }
    try {
      const result = await crawlSingleRestaurant(source.slug);
      if (result.skipped) {
        results.push({ slug: source.slug, outcome: "skipped" });
      } else if (result.partial) {
        results.push({ slug: source.slug, outcome: "partial", error: result.error });
      } else if (result.error) {
        results.push({ slug: source.slug, outcome: "failed", error: result.error });
      } else {
        results.push({
          slug: source.slug,
          outcome: "completed",
          document_id: result.document_id,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ slug: source.slug, outcome: "failed", error: message });
    }
  }

  const health = await getMenuPipelineHealth();
  const alerts = await evaluateMenuPipelineAlerts(health, {
    cronJob: "retry-failed-crawls",
  });

  const summary = {
    attempted: sources.length,
    completed: results.filter((r) => r.outcome === "completed").length,
    partial: results.filter((r) => r.outcome === "partial").length,
    failed: results.filter((r) => r.outcome === "failed").length,
    skipped: results.filter((r) => r.outcome === "skipped").length,
    results,
    health,
    alerts_triggered: alerts,
  };
  console.warn("[cron/retry-failed-crawls] Summary:", summary);
  return NextResponse.json({ ok: true, summary });
}
