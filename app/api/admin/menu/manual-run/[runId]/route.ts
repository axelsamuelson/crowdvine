import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getMenuManualRunById } from "@/lib/menu-extraction/db";

/**
 * GET /api/admin/menu/manual-run/:runId
 * Returns the run row (status, steps, document_id, error_message, timestamps).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await requireAdmin();
    const { runId } = await params;
    const run = await getMenuManualRunById(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
