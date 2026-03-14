import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { listStarwinelistSources } from "@/lib/menu-extraction/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/admin/menu-extraction/crawl/sources
 * Query: city (optional) – filter by city
 * Returns sources with last_error, crawl_attempts, and latest_document { file_name, extraction_status } when present.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const city = request.nextUrl.searchParams.get("city") ?? undefined;
    const sources = await listStarwinelistSources(city || undefined);
    const docIds = sources
      .map((s) => (s as { latest_document_id?: string | null }).latest_document_id)
      .filter(Boolean) as string[];
    let docMap: Record<string, { file_name: string; extraction_status: string }> = {};
    if (docIds.length > 0) {
      const sb = getSupabaseAdmin();
      const { data: docs } = await sb
        .from("menu_documents")
        .select("id, file_name, extraction_status")
        .in("id", docIds);
      docMap = (docs ?? []).reduce(
        (acc, d) => {
          acc[(d as { id: string }).id] = {
            file_name: (d as { file_name: string }).file_name,
            extraction_status: (d as { extraction_status: string }).extraction_status,
          };
          return acc;
        },
        {} as Record<string, { file_name: string; extraction_status: string }>
      );
    }
    const withDocs = sources.map((s) => {
      const src = s as typeof s & { last_error?: string | null; crawl_attempts?: number };
      const docId = (s as { latest_document_id?: string | null }).latest_document_id;
      const latest_document = docId && docMap[docId] ? { id: docId, ...docMap[docId] } : null;
      return { ...src, latest_document };
    });
    return NextResponse.json({ sources: withDocs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] GET /crawl/sources error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
