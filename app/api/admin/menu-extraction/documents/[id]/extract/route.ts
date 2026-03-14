import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getMenuDocumentById, getExtractedRowsByDocumentId } from "@/lib/menu-extraction/db";
import { extractMenuFromDocument } from "@/lib/menu-extraction/service";

/**
 * POST /api/admin/menu-extraction/documents/:id/extract
 * Trigger AI extraction for the document. Requires raw_text to be set.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const document = await getMenuDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (!document.file_path?.trim()) {
      return NextResponse.json(
        {
          error:
            "Document has no file_path. PDF must exist in storage before running extraction.",
        },
        { status: 400 }
      );
    }
    await extractMenuFromDocument(id);
    const updated = await getMenuDocumentById(id);
    const rows = await getExtractedRowsByDocumentId(id);
    const stats = {
      total_rows: rows.length,
      needs_review_count: rows.filter((r) => r.needs_review).length,
      high_confidence_count: rows.filter(
        (r) => r.confidence_label === "high"
      ).length,
    };
    return NextResponse.json({
      document: updated,
      stats,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] POST /documents/[id]/extract error:", err);
    return NextResponse.json(
      { error: message, error_message: message },
      { status: status === 401 ? 401 : 500 }
    );
  }
}
