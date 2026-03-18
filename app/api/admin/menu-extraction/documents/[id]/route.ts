import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import {
  getMenuDocumentById,
  getDocumentSectionsByDocumentId,
  getExtractedRowsByDocumentId,
} from "@/lib/menu-extraction/db";

/**
 * GET /api/admin/menu-extraction/documents/:id
 * Get document with sections, rows, and stats.
 */
export async function GET(
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
    const [sections, rows] = await Promise.all([
      getDocumentSectionsByDocumentId(id),
      getExtractedRowsByDocumentId(id),
    ]);
    const total_rows = rows.length;
    const needs_review_count = rows.filter((r) => r.needs_review).length;
    const reviewed_count = rows.filter((r) => !r.needs_review).length;
    const high_confidence_count = rows.filter(
      (r) => r.confidence_label === "high"
    ).length;
    const ambiguous_format_count = rows.filter((r) =>
      Array.isArray(r.review_reasons) && r.review_reasons.includes("ambiguous_format")
    ).length;
    const auto_corrected_count = rows.filter((r) => r.auto_corrected === true).length;
    const by_section: Record<string, number> = {};
    for (const s of sections) {
      by_section[s.section_name] = rows.filter(
        (r) => r.section_id === s.id
      ).length;
    }
    return NextResponse.json({
      document,
      sections,
      rows,
      stats: {
        total_rows,
        needs_review_count,
        reviewed_count,
        high_confidence_count,
        ambiguous_format_count,
        auto_corrected_count,
        by_section,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] GET /documents/[id] error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
