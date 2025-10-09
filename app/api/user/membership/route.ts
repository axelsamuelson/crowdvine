import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getLevelInfo, getNextLevelInfo } from "@/lib/membership/points-engine";
import { getAvailableInvites, checkAndResetQuotaIfNeeded } from "@/lib/membership/invite-quota";

/**
 * GET /api/user/membership
 * 
 * Returns current user's membership status, level, IP, perks, and invite quota
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sb = getSupabaseAdmin();

    // Check and reset quota if needed
    await checkAndResetQuotaIfNeeded(user.id);

    // Get membership data
    const { data: membership, error: membershipError } = await sb
      .from('user_memberships')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      );
    }

    // Get perks for current level
    const { data: perks, error: perksError } = await sb
      .from('membership_perks')
      .select('*')
      .eq('level', membership.level)
      .eq('is_active', true)
      .order('sort_order');

    if (perksError) throw perksError;

    // Get available invites
    const inviteInfo = await getAvailableInvites(user.id);

    // Get level info
    const currentLevelInfo = getLevelInfo(membership.level);
    const nextLevelInfo = getNextLevelInfo(membership.impact_points, membership.level);

    return NextResponse.json({
      membership: {
        level: membership.level,
        impactPoints: membership.impact_points,
        levelAssignedAt: membership.level_assigned_at,
        createdAt: membership.created_at,
      },
      levelInfo: currentLevelInfo,
      nextLevel: nextLevelInfo,
      invites: {
        available: inviteInfo.available,
        used: inviteInfo.used,
        total: inviteInfo.total,
        resetsAt: membership.last_quota_reset,
      },
      perks: perks || [],
    });
  } catch (error) {
    console.error("Error fetching membership:", error);
    return NextResponse.json(
      { error: "Failed to fetch membership data" },
      { status: 500 }
    );
  }
}

