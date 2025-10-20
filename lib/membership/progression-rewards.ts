/**
 * PACT Wines - Progression Rewards System
 *
 * Handles logic for awarding, tracking, and applying temporary progression buffs
 * earned during level progression (between Basic→Bronze, Bronze→Silver, Silver→Gold).
 *
 * Buffs accumulate until used (on next order) or cleared (on level-up).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { MembershipLevel, LEVEL_THRESHOLDS } from "./points-engine";

export interface ProgressionBuff {
  id: string;
  buff_percentage: number;
  buff_description: string;
  earned_at: string;
  level_segment: string;
}

export interface ProgressionReward {
  id: string;
  level_segment: string;
  ip_threshold: number;
  reward_type: string;
  reward_value: string;
  reward_description: string;
}

/**
 * Get the level segment a user is currently in based on their IP and level
 */
export function getLevelSegment(
  currentIP: number,
  currentLevel: MembershipLevel,
): string | null {
  // Determine which segment user is in
  if (currentLevel === "basic" && currentIP >= 0 && currentIP <= 4) {
    return "basic-bronze";
  }
  if (currentLevel === "brons" && currentIP >= 5 && currentIP <= 14) {
    return "bronze-silver";
  }
  if (currentLevel === "silver" && currentIP >= 15 && currentIP <= 34) {
    return "silver-gold";
  }

  // Admin or Gold (max level) - no progression segment
  return null;
}

/**
 * Award progression buff based on IP milestone
 *
 * Rules:
 * - Basic→Bronze: Every 2 IP gives +0.5% (max 5%)
 * - Bronze→Silver: At 10 IP: early access token; at 14 IP: fee waiver
 * - Silver→Gold: Every 5 IP gives +1% (max 5%); at 30 IP: badge; at 35 IP: confetti
 */
export async function awardProgressionBuff(
  userId: string,
  currentIP: number,
  currentLevel: MembershipLevel,
  ipEventId?: string,
): Promise<{ success: boolean; buff?: ProgressionBuff; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    // Get current level segment
    const levelSegment = getLevelSegment(currentIP, currentLevel);
    if (!levelSegment) {
      // No progression segment (Admin or Gold)
      return { success: true };
    }

    // Get all rewards for this segment
    const { data: rewards, error: rewardsError } = await sb
      .from("progression_rewards")
      .select("*")
      .eq("level_segment", levelSegment)
      .eq("ip_threshold", currentIP)
      .eq("is_active", true);

    if (rewardsError) throw rewardsError;

    if (!rewards || rewards.length === 0) {
      // No rewards at this IP threshold
      return { success: true };
    }

    // Process buff_percentage rewards (temporary discounts)
    const buffRewards = rewards.filter(
      (r) => r.reward_type === "buff_percentage",
    );

    if (buffRewards.length > 0) {
      // Check if user already has this buff (avoid duplicates)
      for (const reward of buffRewards) {
        const { data: existingBuff } = await sb
          .from("user_progression_buffs")
          .select("id")
          .eq("user_id", userId)
          .eq("level_segment", levelSegment)
          .eq("buff_percentage", parseFloat(reward.reward_value))
          .is("used_at", null)
          .single();

        if (existingBuff) {
          // Buff already exists, skip
          continue;
        }

        // Create new buff
        const { data: newBuff, error: buffError } = await sb
          .from("user_progression_buffs")
          .insert({
            user_id: userId,
            buff_percentage: parseFloat(reward.reward_value),
            buff_description: reward.reward_description,
            level_segment: levelSegment,
            related_ip_event_id: ipEventId || null,
            expires_on_use: true,
          })
          .select()
          .single();

        if (buffError) throw buffError;

        return { success: true, buff: newBuff as ProgressionBuff };
      }
    }

    // Other reward types (badge, early_access_token, fee_waiver, celebration)
    // can be handled here or in separate functions as needed

    return { success: true };
  } catch (error) {
    console.error("Error awarding progression buff:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get active (unused) buffs for a user
 */
export async function getActiveProgressionBuffs(
  userId: string,
): Promise<{ success: boolean; buffs: ProgressionBuff[]; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    const { data, error } = await sb
      .from("user_progression_buffs")
      .select("*")
      .eq("user_id", userId)
      .is("used_at", null)
      .order("earned_at", { ascending: true });

    if (error) throw error;

    return { success: true, buffs: (data || []) as ProgressionBuff[] };
  } catch (error) {
    console.error("Error fetching active progression buffs:", error);
    return { success: false, buffs: [], error: error.message };
  }
}

/**
 * Calculate total buff percentage from all active buffs
 */
export async function calculateTotalBuffPercentage(
  userId: string,
): Promise<{ success: boolean; totalPercentage: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    const { data, error } = await sb.rpc("calculate_total_buff_percentage", {
      p_user_id: userId,
    });

    if (error) throw error;

    return { success: true, totalPercentage: data || 0 };
  } catch (error) {
    console.error("Error calculating total buff percentage:", error);
    return { success: false, totalPercentage: 0, error: error.message };
  }
}

/**
 * Apply progression buffs to an order (mark as used)
 * Returns the total discount percentage that was applied
 */
export async function applyProgressionBuffs(
  userId: string,
  orderId?: string,
): Promise<{
  success: boolean;
  appliedPercentage: number;
  buffCount: number;
  error?: string;
}> {
  const sb = getSupabaseAdmin();

  try {
    // Get total percentage before applying
    const { totalPercentage } = await calculateTotalBuffPercentage(userId);

    // Mark all active buffs as used
    const { data, error } = await sb.rpc("apply_progression_buffs", {
      p_user_id: userId,
      p_order_id: orderId || null,
    });

    if (error) throw error;

    const buffCount = data || 0;

    console.log(
      `Applied ${buffCount} progression buffs (${totalPercentage}%) for user ${userId} on order ${orderId}`,
    );

    return {
      success: true,
      appliedPercentage: totalPercentage,
      buffCount,
    };
  } catch (error) {
    console.error("Error applying progression buffs:", error);
    return {
      success: false,
      appliedPercentage: 0,
      buffCount: 0,
      error: error.message,
    };
  }
}

/**
 * Clear all progression buffs on level-up
 * When a user reaches a new level, their progression buffs are cleared
 */
export async function clearProgressionBuffsOnLevelUp(
  userId: string,
): Promise<{ success: boolean; clearedCount: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    const { data, error } = await sb.rpc(
      "clear_progression_buffs_on_level_up",
      {
        p_user_id: userId,
      },
    );

    if (error) throw error;

    const clearedCount = data || 0;

    console.log(
      `Cleared ${clearedCount} progression buffs for user ${userId} on level-up`,
    );

    return { success: true, clearedCount };
  } catch (error) {
    console.error("Error clearing progression buffs on level-up:", error);
    return { success: false, clearedCount: 0, error: error.message };
  }
}

/**
 * Get all progression rewards for a level segment (for display/admin)
 */
export async function getProgressionRewardsForSegment(
  levelSegment: string,
): Promise<{ success: boolean; rewards: ProgressionReward[]; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    const { data, error } = await sb
      .from("progression_rewards")
      .select("*")
      .eq("level_segment", levelSegment)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return { success: true, rewards: (data || []) as ProgressionReward[] };
  } catch (error) {
    console.error("Error fetching progression rewards:", error);
    return { success: false, rewards: [], error: error.message };
  }
}

/**
 * Check if user should receive progression buff at current IP
 * Called after IP is awarded to check for milestone rewards
 */
export async function checkAndAwardProgressionRewards(
  userId: string,
  newIP: number,
  currentLevel: MembershipLevel,
  ipEventId?: string,
): Promise<{ success: boolean; awarded: boolean; error?: string }> {
  try {
    const result = await awardProgressionBuff(
      userId,
      newIP,
      currentLevel,
      ipEventId,
    );

    if (result.buff) {
      console.log(
        `Awarded progression buff: ${result.buff.buff_description} to user ${userId}`,
      );
      return { success: true, awarded: true };
    }

    return { success: true, awarded: false };
  } catch (error) {
    console.error("Error checking/awarding progression rewards:", error);
    return { success: false, awarded: false, error: error.message };
  }
}

/**
 * Get progression summary for a user (for UI display)
 */
export async function getProgressionSummary(userId: string): Promise<{
  success: boolean;
  activeBuffs: ProgressionBuff[];
  totalPercentage: number;
  currentSegment: string | null;
  error?: string;
}> {
  try {
    const buffsResult = await getActiveProgressionBuffs(userId);
    const percentageResult = await calculateTotalBuffPercentage(userId);

    if (!buffsResult.success || !percentageResult.success) {
      throw new Error("Failed to fetch progression summary");
    }

    // Get current level to determine segment
    const sb = getSupabaseAdmin();
    const { data: membership, error: membershipError } = await sb
      .from("user_memberships")
      .select("level, impact_points")
      .eq("user_id", userId)
      .single();

    if (membershipError) throw membershipError;

    const currentSegment = membership
      ? getLevelSegment(membership.impact_points, membership.level)
      : null;

    return {
      success: true,
      activeBuffs: buffsResult.buffs,
      totalPercentage: percentageResult.totalPercentage,
      currentSegment,
    };
  } catch (error) {
    console.error("Error fetching progression summary:", error);
    return {
      success: false,
      activeBuffs: [],
      totalPercentage: 0,
      currentSegment: null,
      error: error.message,
    };
  }
}
