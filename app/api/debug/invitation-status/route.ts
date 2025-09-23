import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Code parameter is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Get invitation details
    const { data: invitation, error } = await supabase
      .from("invitation_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        {
          error: "Invitation not found",
          details: error?.message,
        },
        { status: 404 },
      );
    }

    // Get discount codes for this invitation
    const { data: discountCodes } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("earned_for_invitation_id", invitation.id);

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        code: invitation.code,
        created_by: invitation.created_by,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
        max_uses: invitation.max_uses,
        current_uses: invitation.current_uses,
        is_active: invitation.is_active,
        used_at: invitation.used_at,
        used_by: invitation.used_by,
      },
      discountCodes: discountCodes || [],
      debug: {
        isExpired: invitation.expires_at
          ? new Date(invitation.expires_at) < new Date()
          : false,
        isUsed: invitation.current_uses > 0,
        isActive: invitation.is_active,
        hasReward: (discountCodes || []).length > 0,
      },
    });
  } catch (error) {
    console.error("Debug invitation status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
