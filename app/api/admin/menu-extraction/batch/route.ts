import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { createBulkExtractionBatch } from "@/lib/menu-extraction/batch";
import { getMenuDocumentById } from "@/lib/menu-extraction/db";

/**
 * POST /api/admin/menu-extraction/batch
 * Create a bulk extraction batch (Phase 1 sync + submit to Anthropic Batch API).
 * Body: { documentIds: string[] }
 * Returns: { batchId, anthropicBatchId, requestCount, documentIds }
 * Poll GET /api/admin/menu-extraction/batch/[id] for status; when "ended", call POST .../batch/[id]/process to save results.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const documentIds = Array.isArray(body.documentIds) ? body.documentIds : [];
    if (documentIds.length === 0) {
      return NextResponse.json(
        { error: "documentIds must be a non-empty array" },
        { status: 400 }
      );
    }
    for (const id of documentIds) {
      const doc = await getMenuDocumentById(id);
      if (!doc) {
        return NextResponse.json({ error: `Document not found: ${id}` }, { status: 404 });
      }
      if (!doc.file_path?.trim()) {
        return NextResponse.json(
          { error: `Document ${id} has no file_path` },
          { status: 400 }
        );
      }
    }
    const { batchId, anthropicBatchId, requestCount } = await createBulkExtractionBatch(documentIds);
    return NextResponse.json({
      batchId,
      anthropicBatchId,
      requestCount,
      documentIds,
      message: "Batch submitted. Poll GET /api/admin/menu-extraction/batch/[batchId] for status; when status is 'ended', call POST .../batch/[batchId]/process to save results.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] POST /batch error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
