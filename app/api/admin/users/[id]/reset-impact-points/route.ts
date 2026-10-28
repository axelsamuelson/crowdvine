import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    try {
      await requireAdmin();
    } catch (error) {
      const status = error instanceof AdminAuthError ? error.status : 401;
      return NextResponse.json(
        { error: status === 403 ? "Forbidden" : "Unauthorized" },
        { status },
      );
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
