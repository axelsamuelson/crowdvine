import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getMenuDocumentByFilePath } from "@/lib/menu-extraction/db";

/**
 * GET /api/admin/menu-extraction/documents/by-path?file_path=babette/2026-03-10T23-24-53-885Z.pdf
 * Returns the document so the client can navigate to /admin/menu-extraction/[id].
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const file_path = request.nextUrl.searchParams.get("file_path");
    if (!file_path?.trim()) {
      return NextResponse.json(
        { error: "file_path query is required" },
        { status: 400 }
      );
    }
    const document = await getMenuDocumentByFilePath(file_path.trim());
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] GET /documents/by-path error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
