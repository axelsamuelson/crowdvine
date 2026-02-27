import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runDiagnostic } from "@/lib/external-prices/diagnose";

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
 * POST /api/admin/price-sources/diagnose
 * Body: { wineId: string, sourceId: string }
 * Returns structured diagnostic for one wine + one source (requests, candidates, match breakdown, decisions).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { wineId?: string; sourceId?: string };
    const { wineId, sourceId } = body;
    if (!wineId || !sourceId) {
      return NextResponse.json(
        { error: "wineId and sourceId are required" },
        { status: 400 }
      );
    }
    const output = await runDiagnostic(wineId, sourceId);
    return NextResponse.json(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
