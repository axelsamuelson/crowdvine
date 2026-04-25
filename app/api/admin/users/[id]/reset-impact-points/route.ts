import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAuth = request.cookies.get("admin-auth")?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const sb = getSupabaseAdmin();

    const { data: membership, error: fetchError } = await sb
      .from("user_memberships")
      .select("impact_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Membership not found" },
        { status: 500 },
      );
    }

    const currentPoints = Number(membership.impact_points) || 0;
    if (currentPoints === 0) {
      return NextResponse.json({
        success: true,
        message: "Already at 0",
        newTotal: 0,
      });
    }

    const { data: newTotalRaw, error: rpcError } = await sb.rpc(
      "award_impact_points",
      {
        p_user_id: userId,
        p_event_type: "manual_adjustment",
        p_points: -currentPoints,
        p_description: "Admin reset via admin panel",
      },
    );

    if (rpcError) {
      return NextResponse.json(
        { success: false, error: rpcError.message },
        { status: 500 },
      );
    }

    const newTotal =
      typeof newTotalRaw === "number"
        ? newTotalRaw
        : Number(newTotalRaw) || 0;

    return NextResponse.json({
      success: true,
      newTotal,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
