import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOffersByWineId } from "@/lib/external-prices/db";

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
 * GET /api/admin/wines/[id]/offers
 * Returns competitor offers for the wine, sorted by price (lowest first).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: wineId } = await params;
    const offers = await getOffersByWineId(wineId);
    return NextResponse.json(
      offers.map((o) => ({
        price_source_name: o.price_source?.name,
        price_source_slug: o.price_source?.slug,
        pdp_url: o.pdp_url,
        price_amount: o.price_amount,
        currency: o.currency,
        available: o.available,
        match_confidence: o.match_confidence,
        last_updated: o.last_fetched_at,
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
