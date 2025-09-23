import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Check and upgrade reward when user makes a reservation
    const { data: rewardUpgraded, error } = await supabase.rpc('check_and_upgrade_invitation_reward', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error upgrading invitation reward:', error);
      return NextResponse.json({ error: "Failed to upgrade reward" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rewardUpgraded: rewardUpgraded,
      message: rewardUpgraded ? "Reward upgraded for making a reservation!" : "No invitation reward to upgrade"
    });

  } catch (error) {
    console.error('Upgrade invitation reward error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
