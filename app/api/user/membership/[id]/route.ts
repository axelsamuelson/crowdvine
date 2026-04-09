import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getLevelInfo,
  normalizeMembershipLevel,
} from "@/lib/membership/points-engine";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await context.params;
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

    const displayLevel = normalizeMembershipLevel(membership.level);
    const levelInfo = getLevelInfo(displayLevel);

    return NextResponse.json({
      membership: {
        level: displayLevel,
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


