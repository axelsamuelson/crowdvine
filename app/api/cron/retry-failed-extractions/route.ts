import { NextRequest, NextResponse } from "next/server";
import { listMenuDocumentsForExtractionRetry, updateMenuDocument } from "@/lib/menu-extraction/db";
import { extractMenuFromDocument } from "@/lib/menu-extraction/service";

export const maxDuration = 300;

const BATCH = 10;

/**
 * Cron: retry failed or stale processing menu extractions.
 * Secured by CRON_SECRET. Schedule: 0 6 * * * (daily 06:00 UTC)
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await listMenuDocumentsForExtractionRetry(BATCH);
  let now_completed = 0;
  let still_failing = 0;

  for (const doc of docs) {
    const nextRetry = (doc.extraction_retry_count ?? 0) + 1;
    await updateMenuDocument(doc.id, {
      extraction_status: "pending",
      extraction_retry_count: nextRetry,
    });
    try {
      await extractMenuFromDocument(doc.id, { forceSyncOnly: true });
      now_completed += 1;
      console.warn("[cron/retry-failed-extractions] completed after retry", doc.id, doc.source_slug);
    } catch (err) {
      still_failing += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[cron/retry-failed-extractions] still failing", doc.id, doc.source_slug, message);
    }
  }

  const summary = {
    retried: docs.length,
    now_completed,
    still_failing,
  };
  console.warn("[cron/retry-failed-extractions] Summary:", summary);
  return NextResponse.json({ ok: true, summary });
}
