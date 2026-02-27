import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { refreshOffersForWine, refreshOffersForAllWines } from "@/lib/external-prices/service";

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (admin) return;
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const sb = getSupabaseAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("roles, role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.roles?.includes("admin") ||
    profile?.role === "admin" ||
    (user as { roles?: string[]; role?: string }).roles?.includes("admin") ||
    (user as { role?: string }).role === "admin";
  if (!isAdmin) throw new Error("Admin access required");
}

/**
 * POST /api/admin/price-sources/refresh
 * Body: {} for all wines, or { "wineId": "uuid" } for one wine.
 * Returns 200 with summary (processed, results, errors).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({})) as {
      wineId?: string;
      batchSize?: number;
      sourceId?: string;
    };
    const { wineId, batchSize, sourceId } = body;

    if (wineId) {
      const result = await refreshOffersForWine(wineId, { sourceId });
      return NextResponse.json({
        wineId: result.wineId,
        results: result.results,
        errors: result.errors,
      });
    }

    const summary = await refreshOffersForAllWines({ batchSize, sourceId });
    return NextResponse.json({
      processed: summary.processed,
      totalWines: summary.totalWines,
      errors: summary.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
