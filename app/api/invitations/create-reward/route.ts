import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { invitationId, userId } = await request.json();

    if (!invitationId || !userId) {
      return NextResponse.json(
        { error: "Invitation ID and User ID are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if reward already exists for this invitation
    const { data: existingReward } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("earned_for_invitation_id", invitationId)
      .eq("earned_by_user_id", userId)
      .single();

    if (existingReward) {
      return NextResponse.json({
        success: true,
        message: "Reward already exists for this invitation",
        discountCodeId: existingReward.id,
      });
    }

    // Create reward discount code
    const { data: rewardResult, error } = await supabase.rpc(
      "create_invitation_reward_discount",
      {
        p_user_id: userId,
        p_invitation_id: invitationId,
        p_discount_percentage: 10, // 10% discount
      },
    );

    if (error) {
      console.error("Error creating invitation reward:", error);
      return NextResponse.json(
        { error: "Failed to create reward" },
        { status: 500 },
      );
    }

    // Get the created discount code details
    const { data: discountCode, error: fetchError } = await supabase
      .from("discount_codes")
      .select("code, discount_percentage, expires_at")
      .eq("id", rewardResult)
      .single();

    if (fetchError) {
      console.error("Error fetching created discount code:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch discount code details" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reward discount code created successfully",
      discountCode: {
        id: rewardResult,
        code: discountCode.code,
        discountPercentage: discountCode.discount_percentage,
        expiresAt: discountCode.expires_at,
      },
    });
  } catch (error) {
    console.error("Create invitation reward error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
