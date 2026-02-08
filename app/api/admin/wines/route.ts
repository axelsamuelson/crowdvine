import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

/**
 * GET /api/admin/wines
 * List all wines for admin (e.g. wine tasting session setup).
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    const user = await getCurrentUser();

    let isAdmin = !!admin;
    if (!isAdmin && user) {
      const sb = getSupabaseAdmin();
      const { data: profile } = await sb
        .from("profiles")
        .select("roles, role")
        .eq("id", user.id)
        .single();
      isAdmin =
        profile?.roles?.includes("admin") ||
        profile?.role === "admin" ||
        (user as { roles?: string[]; role?: string }).roles?.includes("admin") ||
        (user as { role?: string }).role === "admin";
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const sb = getSupabaseAdmin();
    const { data: wines, error } = await sb
      .from("wines")
      .select(`
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        label_image_path,
        cost_amount,
        cost_currency,
        exchange_rate,
        alcohol_tax_cents,
        producers(name)
      `)
      .order("wine_name")
      .order("vintage", { ascending: false });

    if (error) {
      console.error("Error fetching wines:", error);
      return NextResponse.json(
        { error: "Failed to fetch wines", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(wines ?? []);
  } catch (err: unknown) {
    console.error("Error in GET /api/admin/wines:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch wines",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
