/**
 * PACT Wines - Impact Points Engine
 *
 * Handles all logic for awarding, tracking, and managing Impact Points (IP)
 * and automatic level upgrades in the membership ladder system.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type MembershipLevel =
  | "requester"
  | "basic"
  | "brons"
  | "silver"
  | "guld"
  | "privilege"
  | "admin";
export type IPEventType =
  | "invite_signup"
  | "invite_reservation"
  | "invite_second_order"
  | "own_order"
  | "own_order_large"
  | "pallet_milestone"
  | "pallet_milestone_6"
  | "pallet_milestone_12"
  | "review_submitted"
  | "share_action"
  | "manual_adjustment"
  | "level_upgrade"
  | "migration";

// IP Configuration
export const IP_CONFIG = {
  // Existing events
  INVITE_SIGNUP: 1, // +1 IP when invited user registers
  INVITE_RESERVATION: 2, // +2 IP when invited user makes first reservation
  OWN_ORDER: 1, // +1 IP for own order ≥6 bottles
  PALLET_MILESTONE: 3, // +3 IP at 3 pallets milestone
  MINIMUM_BOTTLES_FOR_IP: 6, // Minimum bottles in order to earn IP

  // New events (Membership Ladder v2)
  INVITE_SECOND_ORDER: 1, // +1 IP when invited user makes second order
  OWN_ORDER_LARGE: 2, // +2 IP for own order ≥12 bottles (replaces OWN_ORDER for large)
  LARGE_ORDER_THRESHOLD: 12, // Bottles threshold for large order bonus
  PALLET_MILESTONE_6: 5, // +5 IP at 6 unique pallets
  PALLET_MILESTONE_12: 10, // +10 IP at 12 unique pallets
  REVIEW_SUBMITTED: 1, // +1 IP for submitting a review (rate-limited)
  SHARE_ACTION: 1, // +1 IP for sharing wine/pallet (rate-limited)
  RATE_LIMIT_HOURS: 24, // Hours between rate-limited actions
} as const;

/** IP needed for one order voucher (extra discount on a order) */
export const POINTS_PER_WINE_VOUCHER = 10;

/** Voucher discount % on an order – higher membership = higher discount */
export const VOUCHER_DISCOUNT_PERCENT: Record<MembershipLevel, number> = {
  requester: 0,
  basic: 5,
  brons: 8,
  silver: 10,
  guld: 12,
  privilege: 15,
  admin: 15,
};

export function getVoucherDiscountPercent(level: MembershipLevel): number {
  return VOUCHER_DISCOUNT_PERCENT[level] ?? 0;
}

// Level Thresholds
export const LEVEL_THRESHOLDS = {
  basic: { min: 0, max: 4 },
  brons: { min: 5, max: 14 },
  silver: { min: 15, max: 34 },
  guld: { min: 35, max: 69 },
  privilege: { min: 70, max: Infinity },
} as const;

// Invite Quotas
export const INVITE_QUOTAS: Record<MembershipLevel, number> = {
  requester: 0,
  basic: 2,
  brons: 5,
  silver: 12,
  guld: 50,
  privilege: 100,
  admin: 999999,
};

/**
 * Award +1 IP when an invited user registers
 */
export async function awardPointsForInviteSignup(
  inviterUserId: string,
  invitedUserId: string,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    // Use the award_impact_points function
    const { data, error } = await sb.rpc("award_impact_points", {
      p_user_id: inviterUserId,
      p_event_type: "invite_signup",
      p_points: IP_CONFIG.INVITE_SIGNUP,
      p_related_user_id: invitedUserId,
      p_description: "Friend joined PACT",
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error("Error awarding points for invite signup:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award +2 IP when an invited user makes their first reservation
 */
export async function awardPointsForInviteReservation(
  inviterUserId: string,
  invitedUserId: string,
  orderId?: string,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    // Check if this is the invited user's first reservation
    const { data: existingOrders, error: checkError } = await sb
      .from("order_reservations")
      .select("id")
      .eq("user_id", invitedUserId)
      .limit(2);

    if (checkError) throw checkError;

    // Only award if this is first or second order (to handle edge cases)
    if (!existingOrders || existingOrders.length <= 1) {
      const { data, error } = await sb.rpc("award_impact_points", {
        p_user_id: inviterUserId,
        p_event_type: "invite_reservation",
        p_points: IP_CONFIG.INVITE_RESERVATION,
        p_related_user_id: invitedUserId,
        p_related_order_id: orderId || null,
        p_description: "Friend made first reservation",
      });

      if (error) throw error;

      return { success: true, newTotal: data };
    }

    return { success: true, newTotal: 0 };
  } catch (error) {
    console.error("Error awarding points for invite reservation:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award IP for own order ≥6 bottles
 * v2: Award +2 IP for large orders (≥12 bottles), +1 IP for regular orders (≥6 bottles)
 */
export async function awardPointsForOwnOrder(
  userId: string,
  bottleCount: number,
  orderId: string,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  // Determine points and event type based on bottle count
  let points = 0;
  let eventType: IPEventType = "own_order";
  let description = "";

  if (bottleCount >= IP_CONFIG.LARGE_ORDER_THRESHOLD) {
    // Large order: ≥12 bottles → +2 IP
    points = IP_CONFIG.OWN_ORDER_LARGE;
    eventType = "own_order_large";
    description = `Large order with ${bottleCount} bottles`;
  } else if (bottleCount >= IP_CONFIG.MINIMUM_BOTTLES_FOR_IP) {
    // Regular order: ≥6 bottles → +1 IP
    points = IP_CONFIG.OWN_ORDER;
    eventType = "own_order";
    description = `Order with ${bottleCount} bottles`;
  } else {
    // Too few bottles, no points
    return { success: true, newTotal: 0 };
  }

  try {
    const { data, error } = await sb.rpc("award_impact_points", {
      p_user_id: userId,
      p_event_type: eventType,
      p_points: points,
      p_related_order_id: orderId,
      p_description: description,
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error("Error awarding points for own order:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award IP for pallet milestones
 * v2: 3 pallets → +3 IP, 6 pallets → +5 IP, 12 pallets → +10 IP
 */
export async function awardPointsForPalletMilestone(
  userId: string,
  palletCount: number,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  // Define milestones with their points and event types
  const milestoneConfig: Record<
    number,
    { points: number; eventType: IPEventType }
  > = {
    3: { points: IP_CONFIG.PALLET_MILESTONE, eventType: "pallet_milestone" },
    6: {
      points: IP_CONFIG.PALLET_MILESTONE_6,
      eventType: "pallet_milestone_6",
    },
    12: {
      points: IP_CONFIG.PALLET_MILESTONE_12,
      eventType: "pallet_milestone_12",
    },
  };

  // Check if this count is a milestone
  if (!milestoneConfig[palletCount]) {
    return { success: true, newTotal: 0 };
  }

  const { points, eventType } = milestoneConfig[palletCount];

  try {
    // Check if this milestone has already been awarded
    const { data: existingEvent, error: checkError } = await sb
      .from("impact_point_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .eq("description", `${palletCount} pallets milestone`)
      .single();

    // If already awarded, skip
    if (existingEvent) {
      return { success: true, newTotal: 0 };
    }

    const { data, error } = await sb.rpc("award_impact_points", {
      p_user_id: userId,
      p_event_type: eventType,
      p_points: points,
      p_description: `${palletCount} pallets milestone`,
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error("Error awarding points for pallet milestone:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Get current membership status for a user
 */
export async function getUserMembership(userId: string) {
  const sb = getSupabaseAdmin();

  try {
    const { data, error } = await sb
      .from("user_memberships")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return { success: true, membership: data };
  } catch (error) {
    console.error("Error fetching user membership:", error);
    return { success: false, membership: null, error: error.message };
  }
}

/**
 * Get display name for membership level (English)
 */
function getLevelDisplayName(level: MembershipLevel): string {
  const levelNames: Record<MembershipLevel, string> = {
    requester: "Requester",
    basic: "Basic",
    brons: "Plus",
    silver: "Premium",
    guld: "Priority",
    privilege: "Privilege",
    admin: "Admin",
  };

  return levelNames[level] || level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Get level name and threshold info
 */
export function getLevelInfo(level: MembershipLevel) {
  const thresholds = LEVEL_THRESHOLDS[level as keyof typeof LEVEL_THRESHOLDS];
  const quota = INVITE_QUOTAS[level];

  return {
    level,
    name: getLevelDisplayName(level),
    minPoints: thresholds?.min || 0,
    maxPoints: thresholds?.max || Infinity,
    inviteQuota: quota,
  };
}

/**
 * Get next level and points needed
 */
export function getNextLevelInfo(
  currentPoints: number,
  currentLevel: MembershipLevel,
) {
  if (currentLevel === "admin") {
    return null; // Admin is max level
  }

  const levels: MembershipLevel[] = ["basic", "brons", "silver", "guld", "privilege"];
  const currentIndex = levels.indexOf(currentLevel);

  if (currentIndex === -1 || currentIndex === levels.length - 1) {
    return null;
  }

  const nextLevel = levels[currentIndex + 1];
  const nextLevelInfo =
    LEVEL_THRESHOLDS[nextLevel as keyof typeof LEVEL_THRESHOLDS];
  const pointsNeeded = nextLevelInfo.min - currentPoints;

  return {
    level: nextLevel,
    name: getLevelDisplayName(nextLevel),
    pointsNeeded: Math.max(0, pointsNeeded),
    minPoints: nextLevelInfo.min,
  };
}

/**
 * Progress toward next order voucher (extra discount on a order; POINTS_PER_WINE_VOUCHER IP per voucher)
 */
export function getVoucherProgress(currentPoints: number) {
  const perVoucher = POINTS_PER_WINE_VOUCHER;
  const progressInCycle = currentPoints % perVoucher;
  const pointsToNextVoucher = perVoucher - progressInCycle;
  const vouchersEarned = Math.floor(currentPoints / perVoucher);
  return {
    progressInCycle,
    pointsToNextVoucher: pointsToNextVoucher === perVoucher ? perVoucher : pointsToNextVoucher,
    progressPercent: (progressInCycle / perVoucher) * 100,
    vouchersEarned,
    pointsPerVoucher: perVoucher,
  };
}

/**
 * Check if user has reached a pallet milestone
 */
export async function checkPalletMilestone(userId: string): Promise<number> {
  const sb = getSupabaseAdmin();

  try {
    // Count unique pallets user has participated in
    const { data, error } = await sb
      .from("order_reservations")
      .select("pallet_id")
      .eq("user_id", userId)
      .not("pallet_id", "is", null);

    if (error) throw error;

    // Get unique pallet count
    const uniquePallets = new Set(data.map((r) => r.pallet_id));
    return uniquePallets.size;
  } catch (error) {
    console.error("Error checking pallet milestone:", error);
    return 0;
  }
}

/**
 * Manual IP adjustment (admin only)
 */
export async function adjustImpactPoints(
  userId: string,
  pointsChange: number,
  description: string,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    const { data, error } = await sb.rpc("award_impact_points", {
      p_user_id: userId,
      p_event_type: "manual_adjustment",
      p_points: pointsChange,
      p_description: description,
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error("Error adjusting impact points:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award +1 IP when invited user makes second order (v2)
 */
export async function awardPointsForInviteSecondOrder(
  inviterUserId: string,
  invitedUserId: string,
  orderId?: string,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    // Check if this is the invited user's second order
    const { data: existingOrders, error: checkError } = await sb
      .from("order_reservations")
      .select("id")
      .eq("user_id", invitedUserId)
      .limit(3);

    if (checkError) throw checkError;

    // Must have exactly 2 orders
    if (!existingOrders || existingOrders.length !== 2) {
      return { success: true, newTotal: 0 };
    }

    // Check if inviter hasn't already received this bonus
    const { data: existingEvent, error: eventCheckError } = await sb
      .from("impact_point_events")
      .select("id")
      .eq("user_id", inviterUserId)
      .eq("event_type", "invite_second_order")
      .eq("related_user_id", invitedUserId)
      .single();

    // If already awarded, skip
    if (existingEvent) {
      return { success: true, newTotal: 0 };
    }

    const { data, error } = await sb.rpc("award_impact_points", {
      p_user_id: inviterUserId,
      p_event_type: "invite_second_order",
      p_points: IP_CONFIG.INVITE_SECOND_ORDER,
      p_related_user_id: invitedUserId,
      p_related_order_id: orderId || null,
      p_description: "Friend made second reservation",
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error("Error awarding points for invite second order:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award +1 IP for submitting a review (v2, rate-limited to 1/day)
 */
export async function awardPointsForReview(
  userId: string,
  reviewId?: string,
): Promise<{
  success: boolean;
  newTotal: number;
  error?: string;
  rateLimited?: boolean;
}> {
  const sb = getSupabaseAdmin();

  try {
    // Check rate limit: no more than 1 review IP per 24 hours
    const rateLimitHours = IP_CONFIG.RATE_LIMIT_HOURS;
    const { data: recentEvent, error: checkError } = await sb
      .from("impact_point_events")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("event_type", "review_submitted")
      .gte(
        "created_at",
        new Date(Date.now() - rateLimitHours * 60 * 60 * 1000).toISOString(),
      )
      .single();

    // If recent event exists, rate limited
    if (recentEvent) {
      return { success: true, newTotal: 0, rateLimited: true };
    }

    const { data, error } = await sb.rpc("award_impact_points", {
      p_user_id: userId,
      p_event_type: "review_submitted",
      p_points: IP_CONFIG.REVIEW_SUBMITTED,
      p_description: `Review submitted${reviewId ? ` (${reviewId})` : ""}`,
    });

    if (error) throw error;

    return { success: true, newTotal: data, rateLimited: false };
  } catch (error) {
    console.error("Error awarding points for review:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award +1 IP for sharing wine/pallet (v2, rate-limited to 1/day)
 */
export async function awardPointsForShare(
  userId: string,
  shareType: "wine" | "pallet",
  resourceId?: string,
): Promise<{
  success: boolean;
  newTotal: number;
  error?: string;
  rateLimited?: boolean;
}> {
  const sb = getSupabaseAdmin();

  try {
    // Check rate limit: no more than 1 share IP per 24 hours
    const rateLimitHours = IP_CONFIG.RATE_LIMIT_HOURS;
    const { data: recentEvent, error: checkError } = await sb
      .from("impact_point_events")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("event_type", "share_action")
      .gte(
        "created_at",
        new Date(Date.now() - rateLimitHours * 60 * 60 * 1000).toISOString(),
      )
      .single();

    // If recent event exists, rate limited
    if (recentEvent) {
      return { success: true, newTotal: 0, rateLimited: true };
    }

    const { data, error } = await sb.rpc("award_impact_points", {
      p_user_id: userId,
      p_event_type: "share_action",
      p_points: IP_CONFIG.SHARE_ACTION,
      p_description: `Shared ${shareType}${resourceId ? ` (${resourceId})` : ""}`,
    });

    if (error) throw error;

    return { success: true, newTotal: data, rateLimited: false };
  } catch (error) {
    console.error("Error awarding points for share:", error);
    return { success: false, newTotal: 0, error: error.message };
  }
}
