import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/menu-extraction/cron-auth";
import { evaluateMenuPipelineAlerts } from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";
import { runCrawlSession } from "@/lib/menu-extraction/crawler";

/**
 * Cron: run Starwinelist crawl for Stockholm (PDF upload + menu_documents only; extraction runs in /api/cron/extract-menus).
 * Uses @sparticuz/chromium on Vercel (no Browserless). Secured by CRON_SECRET.
 * Schedule: 0 3 * * * (daily 03:00 UTC)
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runCrawlSession("stockholm", false);
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
        healthy: false,
        issues: [`crawl-menus cron kraschade: ${message}`],
      },
      { cronJob: "crawl-menus" },
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
