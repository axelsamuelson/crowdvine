import { NextRequest, NextResponse } from "next/server";
import {
  countMenuDocumentsPendingExtraction,
  listPendingMenuDocumentsForExtraction,
} from "@/lib/menu-extraction/db";
import { extractMenuFromDocument } from "@/lib/menu-extraction/service";

export const maxDuration = 300;

const BATCH = 10;

/**
 * Cron: extract pending menu_documents (after crawl-only job uploaded PDFs).
 * Secured by CRON_SECRET. Schedule: 0 4 * * * (daily 04:00 UTC)
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
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
      const duration_ms = Date.now() - t0;
      results.push({
        id: doc.id,
        source_slug: doc.source_slug,
        outcome: "completed",
        duration_ms,
      });
      console.warn("[cron/extract-menus] success", doc.id, doc.source_slug, duration_ms + "ms");
    } catch (err) {
      const duration_ms = Date.now() - t0;
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        id: doc.id,
        source_slug: doc.source_slug,
        outcome: "failed",
        duration_ms,
        error: message,
      });
      console.warn("[cron/extract-menus] failed", doc.id, doc.source_slug, duration_ms + "ms", message);
    }
  }

  const remaining_pending = await countMenuDocumentsPendingExtraction();
  const completed = results.filter((r) => r.outcome === "completed").length;
  const failed = results.filter((r) => r.outcome === "failed").length;

  const summary = {
    processed: results.length,
    completed,
    failed,
    remaining_pending,
    results,
  };
  console.warn("[cron/extract-menus] Summary:", summary);
  return NextResponse.json({ ok: true, summary });
}
