import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getMenuPipelineHealth } from "@/lib/menu-extraction/health";

/**
 * GET /api/admin/menu-extraction/health
 * Pipeline status for admin dashboard.
 */
export async function GET() {
  try {
    await requireAdmin();
    const health = await getMenuPipelineHealth();
    return NextResponse.json({ health });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
