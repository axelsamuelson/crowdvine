import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/menu-extraction/cron-auth";
import {
  evaluateMenuPipelineAlerts,
  withMenuPipelineAlertBatch,
} from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";
import { runBatchedCrawlSession } from "@/lib/menu-extraction/crawler";

export const maxDuration = 300;

/**
 * Cron: boosted-only Starwinelist crawl for Stockholm (PDF upload + menu_documents only).
 * Runs after detect-menu-updates; CRAWL_BOOSTED_ONLY=true limits rotation to crawl_priority > 0.
 * Schedule: 15 6,18 * * * (UTC, 15 min after detect at 06:00 and 18:00)
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return withMenuPipelineAlertBatch(async () => {
    try {
      const summary = await runBatchedCrawlSession("stockholm", false);
      const health = await getMenuPipelineHealth();
      const alerts = await evaluateMenuPipelineAlerts(health, {
        cronJob: "crawl-menus",
      });
      console.warn("[cron/crawl-menus] Summary:", summary);
      return NextResponse.json({
        ok: true,
        summary,
        health,
        alerts_triggered: alerts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[cron/crawl-menus] Error:", message);
      await evaluateMenuPipelineAlerts(
        {
          sources: {
            total: 0,
            completed: 0,
            failed: 0,
            partial: 0,
            pending: 0,
            crawling: 0,
            skipped: 0,
          },
          extraction: {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            failed_recent: 0,
            stuck_processing: 0,
          },
          last_crawl_at: null,
          crawled_last_24h: 0,
          healthy: false,
          issues: [`crawl-menus cron kraschade: ${message}`],
        },
        { cronJob: "crawl-menus" },
      );
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
