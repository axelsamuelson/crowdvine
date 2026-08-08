import { NextRequest, NextResponse } from "next/server";
import { menuCronGate } from "@/lib/menu-extraction/cron-auth";
import {
  evaluateMenuPipelineAlerts,
  withMenuPipelineAlertBatch,
} from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";
import { runBatchedCrawlSession } from "@/lib/menu-extraction/crawler";

export const maxDuration = 300;

/**
 * Cron: weekly full crawl sweep (all sources, not boosted-only).
 * Catches venues outside the widget's ~6 most recent updates.
 * Schedule: 0 4 * * 0 (Sunday 04:00 UTC)
 */
export async function GET(request: NextRequest) {
  const gated = await menuCronGate(request);
  if (gated) return gated;
  return withMenuPipelineAlertBatch(async () => {
    try {
      const summary = await runBatchedCrawlSession("stockholm", false, {
        boostedOnly: false,
      });
      const health = await getMenuPipelineHealth();
      const alerts = await evaluateMenuPipelineAlerts(health, {
        cronJob: "crawl-menus-weekly",
      });
      console.warn("[cron/crawl-menus-weekly] Summary:", summary);
      return NextResponse.json({
        ok: true,
        summary,
        health,
        alerts_triggered: alerts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[cron/crawl-menus-weekly] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
