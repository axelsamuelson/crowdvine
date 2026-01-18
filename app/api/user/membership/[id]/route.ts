import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getLevelInfo } from "@/lib/membership/points-engine";

export async function GET(
  _request: Request,
  context: { params: { id?: string } },
) {
  try {
    const userId = context.params?.id;
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: membership, error } = await sb
      .from("user_memberships")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    const levelInfo = getLevelInfo(membership.level);

    return NextResponse.json({
      membership: {
        level: membership.level,
        impactPoints: membership.impact_points,
        levelAssignedAt: membership.level_assigned_at,
      },
      levelInfo,
    });
  } catch (err) {
    console.error("Error fetching membership by id:", err);
    return NextResponse.json(
      { error: "Failed to fetch membership data" },
      { status: 500 },
    );
  }
}


