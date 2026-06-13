import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/menu-extraction/cron-auth";
import { evaluateMenuPipelineAlerts } from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";
import { runBatchedCrawlSession } from "@/lib/menu-extraction/crawler";

export const maxDuration = 300;

const BATCH = 12;

/**
 * Cron: batched Starwinelist crawl for Stockholm (PDF upload + menu_documents only).
 * Rotates oldest sources from DB so each run fits maxDuration; discovery registers new slugs only.
 * Uses @sparticuz/chromium on Vercel. Secured by CRON_SECRET.
 * Schedule: 0 1,7,13,19 * * * (4× daily UTC)
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runBatchedCrawlSession("stockholm", false, BATCH);
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
}
