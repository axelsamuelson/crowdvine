import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { diagnosePdfUrl } from "@/lib/menu-extraction/browserless-adapter";

/**
 * POST /api/admin/menu-extraction/crawl/diagnose-pdf
 * Body: { pdf_url: string; restaurant_url?: string }
 * Returns diagnostic info for the PDF URL (direct fetch status, content-type, whether session may be required).
 * Does not use restaurant_url for the diagnostic – that is for context only (e.g. for future /function test).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const pdf_url = typeof body.pdf_url === "string" ? body.pdf_url.trim() : "";
    if (!pdf_url) {
      return NextResponse.json(
        { error: "pdf_url is required" },
        { status: 400 }
      );
    }
    const result = await diagnosePdfUrl(pdf_url);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
