import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getMenuExtractionBatchById } from "@/lib/menu-extraction/db";
import { pollBatchStatus } from "@/lib/menu-extraction/batch";

/**
 * GET /api/admin/menu-extraction/batch/:id
 * Get batch status. If status is "ended", call POST .../batch/[id]/process to persist results.
 */
export async function GET(
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
    const statusResult = await pollBatchStatus(id);
    const updated = await getMenuExtractionBatchById(id);
    return NextResponse.json({
      batchId: id,
      status: statusResult.status,
      anthropicStatus: statusResult.anthropicStatus,
      documentIds: updated?.document_ids ?? batch.document_ids,
      requestCount: updated?.document_ids?.length
        ? (updated.phase_1_result && typeof updated.phase_1_result === "object"
            ? Object.values(updated.phase_1_result).reduce((sum, p) => sum + (p?.sectionNames?.length ?? 0), 0)
            : 0)
        : 0,
      errorMessage: updated?.error_message ?? batch.error_message,
      processedAt: updated?.processed_at ?? batch.processed_at,
      message:
        statusResult.status === "ended"
          ? "Call POST /api/admin/menu-extraction/batch/[id]/process to save results."
          : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] GET /batch/[id] error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
