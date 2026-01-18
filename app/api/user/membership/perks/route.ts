import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/membership/perks?level=gold
 * Returns perks for a given membership level.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const level = (searchParams.get("level") || "").trim();

    if (!level) {
      return NextResponse.json({ error: "Missing level" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    const { data: perks, error } = await sb
      .from("membership_perks")
      .select("perk_type, perk_value, description")
      .eq("level", level)
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw error;

    return NextResponse.json({ perks: perks || [] });
  } catch (error) {
    console.error("Error fetching membership perks:", error);
    return NextResponse.json(
      { error: "Failed to fetch perks" },
      { status: 500 },
    );
  }
}
