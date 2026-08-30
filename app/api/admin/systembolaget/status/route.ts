import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();

  const [totalRes, availableRes, syncedRes, curatedRes] = await Promise.all([
    sb
      .from("systembolaget_products")
      .select("product_number", { count: "exact", head: true }),
    sb
      .from("systembolaget_products")
      .select("product_number", { count: "exact", head: true })
      .eq("is_available", true),
    sb
      .from("systembolaget_products")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("systembolaget_curated")
      .select("id", { count: "exact", head: true }),
  ]);

  if (totalRes.error) {
    return NextResponse.json(
      { error: totalRes.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    totalProducts: totalRes.count ?? 0,
    availableWines: availableRes.count ?? 0,
    curatedCount: curatedRes.count ?? 0,
    lastSyncedAt: syncedRes.data?.synced_at ?? null,
  });
}
