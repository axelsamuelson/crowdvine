import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getBrowserAdapterKind } from "@/lib/menu-extraction/browser-adapter";

/**
 * GET /api/admin/menu-extraction/crawl/config
 * Returns which browser adapter is active (for admin UI badge).
 */
export async function GET() {
  try {
    await requireAdmin();
    const browserAdapter = getBrowserAdapterKind();
    return NextResponse.json({ browserAdapter });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
