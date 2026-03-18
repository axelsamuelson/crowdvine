import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getMenuExtractionBatchById } from "@/lib/menu-extraction/db";
import { processBatchResults, pollBatchStatus } from "@/lib/menu-extraction/batch";

/**
 * POST /api/admin/menu-extraction/batch/:id/process
 * Process batch results (reassemble and save to DB). Call when batch status is "ended".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const batch = await getMenuExtractionBatchById(id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    if (batch.status === "processed") {
      return NextResponse.json({
        batchId: id,
        status: "processed",
        processed: batch.document_ids.length,
        errors: [],
        message: "Already processed.",
      });
    }
    const statusResult = await pollBatchStatus(id);
    if (statusResult.status !== "ended" && statusResult.status !== "processed") {
      return NextResponse.json(
        {
          error: `Batch not ready for processing (status: ${statusResult.status}). Wait until status is 'ended'.`,
          status: statusResult.status,
        },
        { status: 400 }
      );
    }
    const { processed, errors } = await processBatchResults(id);
    const updated = await getMenuExtractionBatchById(id);
    return NextResponse.json({
      batchId: id,
      status: updated?.status ?? "processed",
      processed,
      errors,
      documentIds: updated?.document_ids ?? batch.document_ids,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] POST /batch/[id]/process error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
