import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { FOUNDING_MEMBER_MAX_COUNT } from "@/lib/membership/points-engine";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { count, error } = await sb
      .from("user_memberships")
      .select("id", { count: "exact", head: true })
      .eq("level", "founding_member");

    if (error) {
      throw error;
    }

    const used = count ?? 0;
    const spotsRemaining = Math.max(0, FOUNDING_MEMBER_MAX_COUNT - used);

    return NextResponse.json(
      { spotsRemaining },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/founding-member/spots-remaining] Error:", message);
    return NextResponse.json(
      { spotsRemaining: 0 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      },
    );
  }
}

