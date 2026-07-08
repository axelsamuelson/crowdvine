import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/menu-extraction/cron-auth";
import {
  evaluateMenuPipelineAlerts,
  withMenuPipelineAlertBatch,
} from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";
import { runDetectMenuUpdatesSafe } from "@/lib/menu-extraction/detect-menu-updates";
import { BrowserAdapterError } from "@/lib/menu-extraction/browser-adapter-error";
import {
  alertBrowserlessLimit,
  alertDetectMenuUpdatesFailure,
} from "@/lib/menu-extraction/pipeline-alerts";

export const maxDuration = 120;

/**
 * Cron: widget-primary + sitemap-secondary detection for crawl_priority boosts.
 *
 * Schedule (vercel.json, UTC, 2×/day): 0 6,18 * * *
 * Widget covers same-day updates (~6 most recent); crawl follows at :15.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withMenuPipelineAlertBatch(async () => {
    try {
      const summary = await runDetectMenuUpdatesSafe("stockholm");

      const hardFail =
        Boolean(summary.error) &&
        summary.priority_boosted === 0 &&
        (summary.wine_place_entries ?? 0) === 0 &&
        (summary.widget_entries ?? 0) === 0;

      if (hardFail && summary.error) {
        await alertDetectMenuUpdatesFailure(summary.error);
        return NextResponse.json({ ok: false, summary }, { status: 500 });
      }

      const health = await getMenuPipelineHealth();
      const alerts = await evaluateMenuPipelineAlerts(health, {
        cronJob: "detect-menu-updates",
      });

      console.warn("[cron/detect-menu-updates] Summary:", summary);
      return NextResponse.json({
        ok: true,
        summary,
        health,
        alerts_triggered: alerts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof BrowserAdapterError && err.status === 401) {
        await alertBrowserlessLimit(401, message, "detect-menu-updates");
      } else if (err instanceof BrowserAdapterError && err.status === 429) {
        await alertBrowserlessLimit(429, message, "detect-menu-updates");
      } else {
        await alertDetectMenuUpdatesFailure(message);
      }
      console.error("[cron/detect-menu-updates] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
