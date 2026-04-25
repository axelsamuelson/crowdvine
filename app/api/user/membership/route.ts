import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import {
  getLevelInfo,
  getNextLevelInfo,
  normalizeMembershipLevel,
  type MembershipLevel,
} from "@/lib/membership/points-engine";
import {
  getAvailableInvites,
  checkAndResetQuotaIfNeeded,
} from "@/lib/membership/invite-quota";
import { getCurrentTier, TIER_THRESHOLDS } from "@/lib/membership/pact-points-engine";

function getNextPactTier(current: MembershipLevel): MembershipLevel | null {
  if (current === "founding_member") return null;
  if (current === "privilege") return null;
  if (current === "guld") return "privilege";
  if (current === "silver") return "guld";
  if (current === "brons") return "silver";
  // Treat requester as basic for PACT tiering display purposes.
  return "brons";
}

/**
 * GET /api/user/membership
 *
 * Returns current user's membership status, level, IP, perks, and invite quota
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Check and reset quota if needed
    await checkAndResetQuotaIfNeeded(user.id);

    // Get membership data
    const { data: membership, error: membershipError } = await sb
      .from("user_memberships")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    const displayLevel = normalizeMembershipLevel(membership.level);

    // Get perks for current tier (admin is not a tier — map to privilege for lookup)
    const { data: perks, error: perksError } = await sb
      .from("membership_perks")
      .select("*")
      .eq("level", displayLevel)
      .eq("is_active", true)
      .order("sort_order");

    if (perksError) throw perksError;

    // Get available invites
    const inviteInfo = await getAvailableInvites(user.id);

    // Get level info
    const currentLevelInfo = getLevelInfo(displayLevel);
    const nextLevelInfo = getNextLevelInfo(
      membership.impact_points,
      displayLevel,
    );

    // PACT Points (graceful, never break response)
    let pactBalance = 0;
    let pactLifetime = 0;
    let rolling12Months = 0;
    let currentTier: MembershipLevel = "basic";
    let nextTier: MembershipLevel | null = null;
    let pointsToNextTier: number | null = null;
    let nextTierThreshold: number | null = null;

    try {
      pactBalance = Number(membership.pact_points) || 0;
      pactLifetime = Number(membership.pact_points_lifetime) || 0;

      const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const { data: rows, error: sumErr } = await sb
        .from("pact_points_events")
        .select("points_delta")
        .eq("user_id", user.id)
        .gt("points_delta", 0)
        .gt("created_at", cutoff);

      if (!sumErr) {
        rolling12Months = (rows ?? []).reduce(
          (acc, row) => acc + (Number(row.points_delta) || 0),
          0,
        );
      }

      currentTier = await getCurrentTier(user.id);
      nextTier = getNextPactTier(currentTier);
      if (nextTier) {
        const threshold =
          nextTier === "brons"
            ? TIER_THRESHOLDS.brons.min
            : nextTier === "silver"
              ? TIER_THRESHOLDS.silver.min
              : nextTier === "guld"
                ? TIER_THRESHOLDS.guld.min
                : TIER_THRESHOLDS.privilege.min;
        nextTierThreshold = threshold;
        pointsToNextTier = Math.max(0, threshold - rolling12Months);
      }
    } catch (e) {
      console.error("[membership] pactPoints calc failed:", e);
    }

    return NextResponse.json({
      membership: {
        level: displayLevel,
        impactPoints: membership.impact_points,
        levelAssignedAt: membership.level_assigned_at,
        createdAt: membership.created_at,
        foundingMemberSince: membership.founding_member_since ?? null,
      },
      pactPoints: {
        balance: pactBalance,
        lifetime: pactLifetime,
        rolling12Months,
        currentTier,
        nextTier,
        pointsToNextTier,
        nextTierThreshold,
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
      { status: 500 },
    );
  }
}
