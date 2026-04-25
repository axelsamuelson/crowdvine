/**
 * PACT Points — earn / tier / redeem (parallel to Impact Points in points-engine.ts).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MembershipLevel } from "@/lib/membership/points-engine";

export const PACT_POINTS_FIRST_VOUCHER_THRESHOLD = 5;
export const PACT_POINTS_PER_BOTTLE_BASE = 1;
export const PACT_POINTS_WELCOME_BONUS = 50;
export const PACT_POINTS_INVITE_REWARD = 30;
export const PACT_POINTS_REVIEW_REWARD = 10;
export const PACT_POINTS_ZONE_SET_REWARD = 5;
export const PACT_POINTS_EXPIRY_DAYS = 365;
export const PACT_POINTS_MAX_REDEMPTION_PERCENT = 50;

export const TIER_POINTS_MULTIPLIER: Record<MembershipLevel, number> = {
  requester: 1,
  basic: 1,
  brons: 1.5,
  silver: 2,
  guld: 3,
  privilege: 4,
  founding_member: 5,
};

export const TIER_THRESHOLDS = {
  basic: { min: 0, max: 24 },
  brons: { min: 25, max: 60 },
  silver: { min: 61, max: 120 },
  guld: { min: 121, max: 240 },
  privilege: { min: 241, max: Infinity },
} as const;

export function getTierMultiplier(level: MembershipLevel): number {
  return TIER_POINTS_MULTIPLIER[level] ?? 1;
}

export function calculateBottlePoints(
  bottleCount: number,
  level: MembershipLevel,
): number {
  return Math.round(
    bottleCount * PACT_POINTS_PER_BOTTLE_BASE * getTierMultiplier(level),
  );
}

export async function awardPactPointsForOwnOrder(
  userId: string,
  bottleCount: number,
  relatedOrderId: string,
  level: MembershipLevel,
): Promise<{
  success: boolean;
  pointsAwarded: number;
  newBalance: number;
  error?: string;
}> {
  const pointsAwarded = calculateBottlePoints(bottleCount, level);
  if (pointsAwarded <= 0) {
    try {
      const bal = await getRedeemableBalance(userId);
      return { success: true, pointsAwarded: 0, newBalance: bal };
    } catch {
      return { success: true, pointsAwarded: 0, newBalance: 0 };
    }
  }

  const sb = getSupabaseAdmin();
  try {
    const { data, error } = await sb.rpc("award_pact_points", {
      p_user_id: userId,
      p_event_type: "own_order",
      p_points_delta: pointsAwarded,
      p_bottle_count: bottleCount,
      p_related_order_id: relatedOrderId,
      p_related_user_id: null,
      p_description: `Order with ${bottleCount} bottles at ${level} tier`,
      p_expires_in_days: PACT_POINTS_EXPIRY_DAYS,
    });

    if (error) {
      console.error("[pact-points] awardPactPointsForOwnOrder RPC:", error);
      return {
        success: false,
        pointsAwarded: 0,
        newBalance: 0,
        error: error.message,
      };
    }

    const newBalance = typeof data === "number" ? data : Number(data) || 0;
    return { success: true, pointsAwarded, newBalance };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[pact-points] awardPactPointsForOwnOrder:", e);
    return {
      success: false,
      pointsAwarded: 0,
      newBalance: 0,
      error: message,
    };
  }
}

export async function awardPactPointsWelcomeBonus(
  userId: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const sb = getSupabaseAdmin();
  try {
    const { data: existing, error: exErr } = await sb
      .from("pact_points_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", "welcome_bonus")
      .limit(1)
      .maybeSingle();

    if (exErr) {
      console.error("[pact-points] awardPactPointsWelcomeBonus lookup:", exErr);
      return { success: false, newBalance: 0, error: exErr.message };
    }
    if (existing) {
      const bal = await getRedeemableBalance(userId);
      return { success: true, newBalance: bal };
    }

    const { data, error } = await sb.rpc("award_pact_points", {
      p_user_id: userId,
      p_event_type: "welcome_bonus",
      p_points_delta: PACT_POINTS_WELCOME_BONUS,
      p_bottle_count: null,
      p_related_order_id: null,
      p_related_user_id: null,
      p_description: "Welcome bonus",
      p_expires_in_days: PACT_POINTS_EXPIRY_DAYS,
    });

    if (error) {
      console.error("[pact-points] awardPactPointsWelcomeBonus RPC:", error);
      return { success: false, newBalance: 0, error: error.message };
    }

    const newBalance = typeof data === "number" ? data : Number(data) || 0;
    return { success: true, newBalance };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[pact-points] awardPactPointsWelcomeBonus:", e);
    return { success: false, newBalance: 0, error: message };
  }
}

export async function awardPactPointsForInviteFirstOrder(
  inviterUserId: string,
  inviteeUserId: string,
  relatedOrderId: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const sb = getSupabaseAdmin();
  try {
    const { data: existing, error: exErr } = await sb
      .from("pact_points_events")
      .select("id")
      .eq("user_id", inviterUserId)
      .eq("event_type", "invite_friend_first_order")
      .eq("related_user_id", inviteeUserId)
      .limit(1)
      .maybeSingle();

    if (exErr) {
      console.error(
        "[pact-points] awardPactPointsForInviteFirstOrder lookup:",
        exErr,
      );
      return { success: false, newBalance: 0, error: exErr.message };
    }
    if (existing) {
      const bal = await getRedeemableBalance(inviterUserId);
      return { success: true, newBalance: bal };
    }

    const { data, error } = await sb.rpc("award_pact_points", {
      p_user_id: inviterUserId,
      p_event_type: "invite_friend_first_order",
      p_points_delta: PACT_POINTS_INVITE_REWARD,
      p_bottle_count: null,
      p_related_order_id: relatedOrderId,
      p_related_user_id: inviteeUserId,
      p_description: "Invite reward — friend's first qualifying order",
      p_expires_in_days: PACT_POINTS_EXPIRY_DAYS,
    });

    if (error) {
      console.error(
        "[pact-points] awardPactPointsForInviteFirstOrder RPC:",
        error,
      );
      return { success: false, newBalance: 0, error: error.message };
    }

    const newBalance = typeof data === "number" ? data : Number(data) || 0;
    return { success: true, newBalance };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[pact-points] awardPactPointsForInviteFirstOrder:", e);
    return { success: false, newBalance: 0, error: message };
  }
}

export async function awardPactPointsForReview(
  userId: string,
  relatedOrderId: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const sb = getSupabaseAdmin();
  try {
    const { data: existing, error: exErr } = await sb
      .from("pact_points_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", "review_after_delivery")
      .eq("related_order_id", relatedOrderId)
      .limit(1)
      .maybeSingle();

    if (exErr) {
      console.error("[pact-points] awardPactPointsForReview lookup:", exErr);
      return { success: false, newBalance: 0, error: exErr.message };
    }
    if (existing) {
      const bal = await getRedeemableBalance(userId);
      return { success: true, newBalance: bal };
    }

    const { data, error } = await sb.rpc("award_pact_points", {
      p_user_id: userId,
      p_event_type: "review_after_delivery",
      p_points_delta: PACT_POINTS_REVIEW_REWARD,
      p_bottle_count: null,
      p_related_order_id: relatedOrderId,
      p_related_user_id: null,
      p_description: "Review after delivery",
      p_expires_in_days: PACT_POINTS_EXPIRY_DAYS,
    });

    if (error) {
      console.error("[pact-points] awardPactPointsForReview RPC:", error);
      return { success: false, newBalance: 0, error: error.message };
    }

    const newBalance = typeof data === "number" ? data : Number(data) || 0;
    return { success: true, newBalance };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[pact-points] awardPactPointsForReview:", e);
    return { success: false, newBalance: 0, error: message };
  }
}

export async function awardPactPointsForZoneSet(
  userId: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const sb = getSupabaseAdmin();
  try {
    const { data: existing, error: exErr } = await sb
      .from("pact_points_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", "zone_set")
      .limit(1)
      .maybeSingle();

    if (exErr) {
      console.error("[pact-points] awardPactPointsForZoneSet lookup:", exErr);
      return { success: false, newBalance: 0, error: exErr.message };
    }
    if (existing) {
      const bal = await getRedeemableBalance(userId);
      return { success: true, newBalance: bal };
    }

    const { data, error } = await sb.rpc("award_pact_points", {
      p_user_id: userId,
      p_event_type: "zone_set",
      p_points_delta: PACT_POINTS_ZONE_SET_REWARD,
      p_bottle_count: null,
      p_related_order_id: null,
      p_related_user_id: null,
      p_description: "Delivery zone set bonus",
      p_expires_in_days: PACT_POINTS_EXPIRY_DAYS,
    });

    if (error) {
      console.error("[pact-points] awardPactPointsForZoneSet RPC:", error);
      return { success: false, newBalance: 0, error: error.message };
    }

    const newBalance = typeof data === "number" ? data : Number(data) || 0;
    return { success: true, newBalance };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[pact-points] awardPactPointsForZoneSet:", e);
    return { success: false, newBalance: 0, error: message };
  }
}

function rollingTierFromSum(sum: number): MembershipLevel {
  if (sum >= TIER_THRESHOLDS.privilege.min) return "privilege";
  if (sum >= TIER_THRESHOLDS.guld.min) return "guld";
  if (sum >= TIER_THRESHOLDS.silver.min) return "silver";
  if (sum >= TIER_THRESHOLDS.brons.min) return "brons";
  return "basic";
}

export async function getCurrentTier(userId: string): Promise<MembershipLevel> {
  const sb = getSupabaseAdmin();
  try {
    const { data: membership, error: memErr } = await sb
      .from("user_memberships")
      .select("level")
      .eq("user_id", userId)
      .maybeSingle();

    if (memErr) {
      console.error("[pact-points] getCurrentTier membership:", memErr);
      return "basic";
    }
    if (membership?.level === "founding_member") {
      return "founding_member";
    }

    const cutoff = new Date(
      Date.now() - PACT_POINTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: rows, error: evErr } = await sb
      .from("pact_points_events")
      .select("points_delta")
      .eq("user_id", userId)
      .gt("points_delta", 0)
      .gt("created_at", cutoff);

    if (evErr) {
      console.error("[pact-points] getCurrentTier events:", evErr);
      return "basic";
    }

    const sum = (rows ?? []).reduce(
      (acc, row) => acc + (Number(row.points_delta) || 0),
      0,
    );
    return rollingTierFromSum(sum);
  } catch (e) {
    console.error("[pact-points] getCurrentTier:", e);
    return "basic";
  }
}

export async function getRedeemableBalance(userId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("user_memberships")
    .select("pact_points")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[pact-points] getRedeemableBalance:", error);
    return 0;
  }
  return Number(data?.pact_points) || 0;
}

export function calculateMaxRedemption(
  orderTotalSek: number,
  availablePoints: number,
): number {
  return Math.min(
    availablePoints,
    Math.floor(
      (orderTotalSek * PACT_POINTS_MAX_REDEMPTION_PERCENT) / 100,
    ),
  );
}

export async function redeemPactPoints(
  userId: string,
  pointsToRedeem: number,
  relatedOrderId: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  if (pointsToRedeem <= 0) {
    return {
      success: false,
      newBalance: 0,
      error: "pointsToRedeem must be positive",
    };
  }

  const sb = getSupabaseAdmin();
  try {
    const balance = await getRedeemableBalance(userId);
    if (pointsToRedeem > balance) {
      return {
        success: false,
        newBalance: balance,
        error: "Insufficient PACT Points balance",
      };
    }

    const { data, error } = await sb.rpc("award_pact_points", {
      p_user_id: userId,
      p_event_type: "redemption",
      p_points_delta: -pointsToRedeem,
      p_bottle_count: null,
      p_related_order_id: relatedOrderId,
      p_related_user_id: null,
      p_description: `Redeemed ${pointsToRedeem} PACT Points at checkout`,
      p_expires_in_days: PACT_POINTS_EXPIRY_DAYS,
    });

    if (error) {
      console.error("[pact-points] redeemPactPoints RPC:", error);
      return { success: false, newBalance: balance, error: error.message };
    }

    const newBalance = typeof data === "number" ? data : Number(data) || 0;
    return { success: true, newBalance };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[pact-points] redeemPactPoints:", e);
    return { success: false, newBalance: 0, error: message };
  }
}
