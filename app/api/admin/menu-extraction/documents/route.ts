import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { listMenuDocuments, createMenuDocument } from "@/lib/menu-extraction/db";
import { uploadPdfToStorage } from "@/lib/menu-extraction/storage";

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

function slugFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "manual";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "manual";
}

/**
 * POST /api/admin/menu-extraction/documents
 * JSON body: { file_path, file_name, mime_type? } (existing path-only create)
 * OR multipart FormData with `file` (PDF) — uploads via uploadPdfToStorage then creates the document.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "file is required (PDF)" },
          { status: 400 },
        );
      }
      const fileName = (file.name || "menu.pdf").trim();
      if (!fileName.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Endast PDF stöds" },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length === 0) {
        return NextResponse.json({ error: "Tom fil" }, { status: 400 });
      }
      const slug = slugFromFileName(fileName);
      const timestamp = new Date().toISOString();
      const file_path = await uploadPdfToStorage(slug, buffer, timestamp);
      const document = await createMenuDocument({
        file_path,
        file_name: fileName,
        mime_type: file.type || "application/pdf",
        source_slug: slug,
      });
      return NextResponse.json({ document });
    }

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
