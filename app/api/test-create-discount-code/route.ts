import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Generate a unique discount code
    const generateDiscountCode = () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    };

    let discountCode = generateDiscountCode();
    let codeExists = true;

    // Ensure code is unique
    while (codeExists) {
      const { data: existingCode } = await supabase
        .from("discount_codes")
        .select("id")
        .eq("code", discountCode)
        .single();

      if (!existingCode) {
        codeExists = false;
      } else {
        discountCode = generateDiscountCode();
      }
    }

    // Create a test discount code
    const { data: newDiscountCode, error: rewardError } = await supabase
      .from("discount_codes")
      .insert({
        code: discountCode,
        discount_percentage: 5,
        is_active: true,
        usage_limit: 1,
        current_usage: 0,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 30 days
        earned_by_user_id: null, // Test without user
        earned_for_invitation_id: null, // Test without invitation
      })
      .select()
      .single();

    if (rewardError) {
      console.error("Error creating test discount code:", rewardError);
      return NextResponse.json({
        success: false,
        error: rewardError.message,
        code: rewardError.code,
        hint: rewardError.hint,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Test discount code created successfully",
      discountCode: newDiscountCode,
    });
  } catch (error) {
    console.error("Test discount code creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
