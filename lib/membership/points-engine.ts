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
  | "founding_member";

/** Ordered ladder (excludes requester — not on IP ladder). */
export const MEMBERSHIP_LADDER_LEVELS: MembershipLevel[] = [
  "basic",
  "brons",
  "silver",
  "guld",
  "privilege",
];

/**
 * Map DB / legacy values to a valid membership tier.
 * `admin` was removed as a membership level — use profiles.role for staff admin.
 */
export function normalizeMembershipLevel(
  level: string | null | undefined,
): MembershipLevel {
  const v = (level ?? "requester").toLowerCase();
  if (v === "admin") return "privilege";
  const allowed: MembershipLevel[] = [
    "requester",
    "basic",
    "brons",
    "silver",
    "guld",
    "privilege",
    "founding_member",
  ];
  if (allowed.includes(v as MembershipLevel)) return v as MembershipLevel;
  return "requester";
}
export type IPEventType =
  | "invite_signup"
  | "invite_reservation"
  | "invite_second_order"
  | "own_order"
  | "own_order_medium"
  | "own_order_large"
  | "own_order_xl"
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
  OWN_ORDER: 1, // +1 IP for own order 6–11 bottles
  OWN_ORDER_MEDIUM: 3, // +3 IP for 12–23 bottles
  OWN_ORDER_LARGE: 5, // +5 IP for 24–35 bottles
  OWN_ORDER_XL: 8, // +8 IP for 36+ bottles
  PALLET_MILESTONE: 3, // +3 IP at 3 pallets milestone
  MINIMUM_BOTTLES_FOR_IP: 6, // Minimum bottles in order to earn IP
  MEDIUM_ORDER_THRESHOLD: 12,
  LARGE_ORDER_THRESHOLD: 24,
  EXTRA_LARGE_ORDER_THRESHOLD: 36,

  // New events (Membership Ladder v2)
  INVITE_SECOND_ORDER: 1, // +1 IP when invited user makes second order
  PALLET_MILESTONE_6: 5, // +5 IP at 6 unique pallets
  PALLET_MILESTONE_12: 10, // +10 IP at 12 unique pallets
  REVIEW_SUBMITTED: 1, // +1 IP for submitting a review (rate-limited)
  SHARE_ACTION: 1, // +1 IP for sharing wine/pallet (rate-limited)
  RATE_LIMIT_HOURS: 24, // Hours between rate-limited actions
} as const;

/** Permanent discount % shown in UI / parity with membership_perks for founding tier */
export const FOUNDING_MEMBER_DISCOUNT_PERCENT = 15;

/** Reserved for Prompt B — double IP on qualifying events */
export const FOUNDING_MEMBER_DOUBLE_IP = true;

/** Cap on users who can hold founding_member (enforced when assigning) */
export const FOUNDING_MEMBER_MAX_COUNT = 100;

/** Bottles per calendar half-year required to retain founding_member (enforced by cron) */
export const FOUNDING_MEMBER_ACTIVITY_BOTTLES = 24;

/** Flat voucher value (SEK) for milestone order vouchers */
export const VOUCHER_AMOUNT_SEK = 500;

/** IP required before the first milestone voucher */
export const POINTS_FIRST_VOUCHER_THRESHOLD = 5;

/** IP between each additional milestone voucher after the first */
export const POINTS_PER_ADDITIONAL_VOUCHER = 10;

/**
 * @deprecated Milestone vouchers use a fixed SEK amount ({@link VOUCHER_AMOUNT_SEK}).
 * Kept for callers that still expect a number; returns 0 for every level (including
 * `founding_member` — order discounts use `membership_perks` / {@link FOUNDING_MEMBER_DISCOUNT_PERCENT}).
 */
export function getVoucherDiscountPercent(
  _level: string | MembershipLevel,
): number {
  return 0;
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
  founding_member: 100,
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

function resolveOwnOrderTier(bottleCount: number): {
  basePoints: number;
  eventType: IPEventType;
  description: string;
} | null {
  if (bottleCount >= IP_CONFIG.EXTRA_LARGE_ORDER_THRESHOLD) {
    return {
      basePoints: IP_CONFIG.OWN_ORDER_XL,
      eventType: "own_order_xl",
      description: `Extra large order with ${bottleCount} bottles`,
    };
  }
  if (bottleCount >= IP_CONFIG.LARGE_ORDER_THRESHOLD) {
    return {
      basePoints: IP_CONFIG.OWN_ORDER_LARGE,
      eventType: "own_order_large",
      description: `Large order with ${bottleCount} bottles`,
    };
  }
  if (bottleCount >= IP_CONFIG.MEDIUM_ORDER_THRESHOLD) {
    return {
      basePoints: IP_CONFIG.OWN_ORDER_MEDIUM,
      eventType: "own_order_medium",
      description: `Medium order with ${bottleCount} bottles`,
    };
  }
  if (bottleCount >= IP_CONFIG.MINIMUM_BOTTLES_FOR_IP) {
    return {
      basePoints: IP_CONFIG.OWN_ORDER,
      eventType: "own_order",
      description: `Order with ${bottleCount} bottles`,
    };
  }
  return null;
}

/** Base IP for own-order tiers (no DB). Returns 0 if below minimum bottles for IP. */
export function getBaseIPForBottles(bottleCount: number): number {
  return resolveOwnOrderTier(bottleCount)?.basePoints ?? 0;
}

/**
 * Award IP for own order by bottle tiers: 6–11 (+1), 12–23 (+3), 24–35 (+5), 36+ (+8).
 * When `overridePoints` is set, that amount is awarded but `event_type` still follows `bottleCount`.
 */
export async function awardPointsForOwnOrder(
  userId: string,
  bottleCount: number,
  orderId: string,
  overridePoints?: number,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  const tier = resolveOwnOrderTier(bottleCount);
  let points: number;
  let eventType: IPEventType;
  let description: string;

  if (tier) {
    eventType = tier.eventType;
    description = tier.description;
    points =
      overridePoints !== undefined ? overridePoints : tier.basePoints;
  } else {
    if (overridePoints === undefined || overridePoints <= 0) {
      return { success: true, newTotal: 0 };
    }
    eventType = "own_order";
    description = `Order with ${bottleCount} bottles`;
    points = overridePoints;
  }

  if (points <= 0) {
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
    const message =
      error instanceof Error ? error.message : "Unknown error awarding own order IP";
    console.error("Error awarding points for own order:", error);
    return { success: false, newTotal: 0, error: message };
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
export function getLevelDisplayName(level: MembershipLevel): string {
  const levelNames: Record<MembershipLevel, string> = {
    requester: "Requester",
    basic: "Basic",
    brons: "Bronze",
    silver: "Silver",
    guld: "Gold",
    privilege: "Privilege",
    founding_member: "Founding Member",
  };

  return levelNames[level] || level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Get level name and threshold info
 */
export function getLevelInfo(level: string | MembershipLevel) {
  const L = normalizeMembershipLevel(level);
  const thresholds = LEVEL_THRESHOLDS[L as keyof typeof LEVEL_THRESHOLDS];
  const quota = INVITE_QUOTAS[L];

  return {
    level: L,
    name: getLevelDisplayName(L),
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
  currentLevel: string | MembershipLevel,
) {
  const L = normalizeMembershipLevel(currentLevel);
  const levels: MembershipLevel[] = [
    "basic",
    "brons",
    "silver",
    "guld",
    "privilege",
  ];
  const currentIndex = levels.indexOf(L);

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

export type VoucherProgressResult = {
  vouchersEarned: number;
  progressPercent: number;
  pointsToNext: number;
  pointsPerVoucher: number;
  voucherAmountSek: number;
  /** Progress within current segment (0–4 toward first voucher, then 0–9) */
  progressInCycle: number;
  /** @deprecated Use pointsToNext */
  pointsToNextVoucher: number;
};

/**
 * Progress toward next flat-amount order voucher: first at 5 IP, then every 10 IP.
 */
export function getVoucherProgress(currentPoints: number): VoucherProgressResult {
  const first = POINTS_FIRST_VOUCHER_THRESHOLD;
  const step = POINTS_PER_ADDITIONAL_VOUCHER;
  const amountSek = VOUCHER_AMOUNT_SEK;

  if (currentPoints < first) {
    const progressPercent = (currentPoints / first) * 100;
    const pointsToNext = first - currentPoints;
    return {
      vouchersEarned: 0,
      progressPercent,
      pointsToNext,
      pointsPerVoucher: step,
      voucherAmountSek: amountSek,
      progressInCycle: currentPoints,
      pointsToNextVoucher: pointsToNext,
    };
  }

  const vouchersEarned = 1 + Math.floor((currentPoints - first) / step);
  const pointsInCurrentCycle = (currentPoints - first) % step;
  const progressPercent = (pointsInCurrentCycle / step) * 100;
  const pointsToNext = step - pointsInCurrentCycle;

  return {
    vouchersEarned,
    progressPercent,
    pointsToNext,
    pointsPerVoucher: step,
    voucherAmountSek: amountSek,
    progressInCycle: pointsInCurrentCycle,
    pointsToNextVoucher: pointsToNext,
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
