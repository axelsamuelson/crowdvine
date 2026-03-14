import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { listMenuDocuments, createMenuDocument } from "@/lib/menu-extraction/db";

/**
 * GET /api/admin/menu-extraction/documents
 * List all menu documents. Optionally withStats=true adds total_rows and needs_review_count per document.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const documents = await listMenuDocuments();
    const withStats = request.nextUrl.searchParams.get("withStats") === "true";
    if (withStats && documents.length > 0) {
      const sb = getSupabaseAdmin();
      const ids = documents.map((d) => d.id);
      const { data: rows } = await sb
        .from("menu_extracted_rows")
        .select("document_id, needs_review")
        .in("document_id", ids);
      const stats: Record<string, { total_rows: number; needs_review_count: number }> = {};
      for (const id of ids) stats[id] = { total_rows: 0, needs_review_count: 0 };
      for (const r of rows ?? []) {
        const d = (r as { document_id: string; needs_review: boolean }).document_id;
        if (stats[d]) {
          stats[d].total_rows += 1;
          if ((r as { needs_review: boolean }).needs_review) stats[d].needs_review_count += 1;
        }
      }
      const documentsWithStats = documents.map((d) => ({
        ...d,
        total_rows: stats[d.id]?.total_rows ?? 0,
        needs_review_count: stats[d.id]?.needs_review_count ?? 0,
      }));
      return NextResponse.json({ documents: documentsWithStats });
    }
    return NextResponse.json({ documents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/menu-extraction/documents
 * Create a new menu document. Body: { file_path, file_name, mime_type? }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const file_path =
      typeof body.file_path === "string" ? body.file_path.trim() : "";
    const file_name =
      typeof body.file_name === "string" ? body.file_name.trim() : "";
    if (!file_path || !file_name) {
      return NextResponse.json(
        { error: "file_path and file_name are required" },
        { status: 400 }
      );
    }
    const document = await createMenuDocument({
      file_path,
      file_name,
      mime_type:
        typeof body.mime_type === "string" ? body.mime_type : undefined,
    });
    return NextResponse.json({ document });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
