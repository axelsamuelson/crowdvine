import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/menu-extraction/cron-auth";
import { evaluateMenuPipelineAlerts } from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";
import {
  countMenuDocumentsPendingExtraction,
  listPendingMenuDocumentsForExtraction,
} from "@/lib/menu-extraction/db";
import { extractMenuFromDocument } from "@/lib/menu-extraction/service";

export const maxDuration = 300;

/** Process up to 15 pending documents per run (hourly cron). */
const BATCH = 15;

/**
 * Cron: extract pending menu_documents (after crawl-only job uploaded PDFs).
 * Secured by CRON_SECRET. Schedule: 30 * * * * (hourly at :30 UTC)
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await listPendingMenuDocumentsForExtraction(BATCH);
  const results: Array<{
    id: string;
    source_slug: string | null;
    outcome: "completed" | "failed";
    duration_ms: number;
    error?: string;
  }> = [];

  for (const doc of docs) {
    const t0 = Date.now();
    try {
      await extractMenuFromDocument(doc.id, { forceSyncOnly: true });
      results.push({
        id: doc.id,
        source_slug: doc.source_slug,
        outcome: "completed",
        duration_ms: Date.now() - t0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        id: doc.id,
        source_slug: doc.source_slug,
        outcome: "failed",
        duration_ms: Date.now() - t0,
        error: message,
      });
    }
  }

  const remaining_pending = await countMenuDocumentsPendingExtraction();
  const health = await getMenuPipelineHealth();
  const alerts = await evaluateMenuPipelineAlerts(health, {
    cronJob: "extract-menus",
  });

  const summary = {
    processed: results.length,
    completed: results.filter((r) => r.outcome === "completed").length,
    failed: results.filter((r) => r.outcome === "failed").length,
    remaining_pending,
    results,
    health,
    alerts_triggered: alerts,
  };
  console.warn("[cron/extract-menus] Summary:", summary);
  return NextResponse.json({ ok: true, summary });
}
