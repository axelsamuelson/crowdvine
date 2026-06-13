import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/menu-extraction/cron-auth";
import { evaluateMenuPipelineAlerts } from "@/lib/menu-extraction/alerting";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";
import {
  listMenuDocumentsForExtractionRetry,
  updateMenuDocument,
} from "@/lib/menu-extraction/db";
import { skipExtractionIfDuplicateDocument } from "@/lib/menu-extraction/extract-guard";
import { extractMenuFromDocument } from "@/lib/menu-extraction/service";

export const maxDuration = 300;

const BATCH = 15;

/**
 * Cron: retry failed or stale processing menu extractions.
 * Secured by CRON_SECRET. Schedule: every 6 hours (see vercel.json).
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await listMenuDocumentsForExtractionRetry(BATCH);
  let now_completed = 0;
  let still_failing = 0;
  let skipped_duplicate = 0;

  for (const doc of docs) {
    if (await skipExtractionIfDuplicateDocument(doc.id)) {
      skipped_duplicate += 1;
      continue;
    }
    const nextRetry = (doc.extraction_retry_count ?? 0) + 1;
    await updateMenuDocument(doc.id, {
      extraction_status: "pending",
      extraction_retry_count: nextRetry,
    });
    try {
      await extractMenuFromDocument(doc.id, { forceSyncOnly: true });
      now_completed += 1;
    } catch (err) {
      still_failing += 1;
      console.warn(
        "[cron/retry-failed-extractions] still failing",
        doc.id,
        doc.source_slug,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const health = await getMenuPipelineHealth();
  const alerts = await evaluateMenuPipelineAlerts(health, {
    cronJob: "retry-failed-extractions",
  });

  const summary = {
    retried: docs.length,
    now_completed,
    still_failing,
    skipped_duplicate,
    health,
    alerts_triggered: alerts,
  };
  console.warn("[cron/retry-failed-extractions] Summary:", summary);
  return NextResponse.json({ ok: true, summary });
}
