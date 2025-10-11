/**
 * PACT Wines - Impact Points Engine
 * 
 * Handles all logic for awarding, tracking, and managing Impact Points (IP)
 * and automatic level upgrades in the membership ladder system.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type MembershipLevel = 'requester' | 'basic' | 'brons' | 'silver' | 'guld' | 'admin';
export type IPEventType = 'invite_signup' | 'invite_reservation' | 'own_order' | 'pallet_milestone' | 'manual_adjustment' | 'level_upgrade' | 'migration';

// IP Configuration
export const IP_CONFIG = {
  INVITE_SIGNUP: 1,           // +1 IP when invited user registers
  INVITE_RESERVATION: 2,      // +2 IP when invited user makes first reservation
  OWN_ORDER: 1,               // +1 IP for own order ≥6 bottles
  PALLET_MILESTONE: 3,        // +3 IP at 3, 6, 9 pallets milestone
  MINIMUM_BOTTLES_FOR_IP: 6,  // Minimum bottles in order to earn IP
} as const;

// Level Thresholds
export const LEVEL_THRESHOLDS = {
  basic: { min: 0, max: 4 },
  brons: { min: 5, max: 14 },
  silver: { min: 15, max: 34 },
  guld: { min: 35, max: Infinity },
} as const;

// Invite Quotas
export const INVITE_QUOTAS: Record<MembershipLevel, number> = {
  requester: 0,
  basic: 2,
  brons: 5,
  silver: 12,
  guld: 50,
  admin: 999999,
};

/**
 * Award +1 IP when an invited user registers
 */
export async function awardPointsForInviteSignup(
  inviterUserId: string,
  invitedUserId: string
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    // Use the award_impact_points function
    const { data, error } = await sb.rpc('award_impact_points', {
      p_user_id: inviterUserId,
      p_event_type: 'invite_signup',
      p_points: IP_CONFIG.INVITE_SIGNUP,
      p_related_user_id: invitedUserId,
      p_description: 'Friend joined PACT',
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error('Error awarding points for invite signup:', error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award +2 IP when an invited user makes their first reservation
 */
export async function awardPointsForInviteReservation(
  inviterUserId: string,
  invitedUserId: string,
  orderId?: string
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    // Check if this is the invited user's first reservation
    const { data: existingOrders, error: checkError } = await sb
      .from('order_reservations')
      .select('id')
      .eq('user_id', invitedUserId)
      .limit(2);

    if (checkError) throw checkError;

    // Only award if this is first or second order (to handle edge cases)
    if (!existingOrders || existingOrders.length <= 1) {
      const { data, error } = await sb.rpc('award_impact_points', {
        p_user_id: inviterUserId,
        p_event_type: 'invite_reservation',
        p_points: IP_CONFIG.INVITE_RESERVATION,
        p_related_user_id: invitedUserId,
        p_related_order_id: orderId || null,
        p_description: 'Friend made first reservation',
      });

      if (error) throw error;

      return { success: true, newTotal: data };
    }

    return { success: true, newTotal: 0 };
  } catch (error) {
    console.error('Error awarding points for invite reservation:', error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award +1 IP for own order ≥6 bottles
 */
export async function awardPointsForOwnOrder(
  userId: string,
  bottleCount: number,
  orderId: string
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  // Only award if order has at least 6 bottles
  if (bottleCount < IP_CONFIG.MINIMUM_BOTTLES_FOR_IP) {
    return { success: true, newTotal: 0 };
  }

  try {
    const { data, error } = await sb.rpc('award_impact_points', {
      p_user_id: userId,
      p_event_type: 'own_order',
      p_points: IP_CONFIG.OWN_ORDER,
      p_related_order_id: orderId,
      p_description: `Order with ${bottleCount} bottles`,
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error('Error awarding points for own order:', error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

/**
 * Award +3 IP for pallet milestones (3, 6, 9 unique pallets)
 */
export async function awardPointsForPalletMilestone(
  userId: string,
  palletCount: number
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  // Only award at specific milestones
  const milestones = [3, 6, 9, 12, 15];
  if (!milestones.includes(palletCount)) {
    return { success: true, newTotal: 0 };
  }

  try {
    // Check if this milestone has already been awarded
    const { data: existingEvent, error: checkError } = await sb
      .from('impact_point_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'pallet_milestone')
      .eq('description', `${palletCount} pallets milestone`)
      .single();

    // If already awarded, skip
    if (existingEvent) {
      return { success: true, newTotal: 0 };
    }

    const { data, error } = await sb.rpc('award_impact_points', {
      p_user_id: userId,
      p_event_type: 'pallet_milestone',
      p_points: IP_CONFIG.PALLET_MILESTONE,
      p_description: `${palletCount} pallets milestone`,
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error('Error awarding points for pallet milestone:', error);
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
      .from('user_memberships')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return { success: true, membership: data };
  } catch (error) {
    console.error('Error fetching user membership:', error);
    return { success: false, membership: null, error: error.message };
  }
}

/**
 * Get display name for membership level (English)
 */
function getLevelDisplayName(level: MembershipLevel): string {
  const levelNames: Record<MembershipLevel, string> = {
    'requester': 'Requester',
    'basic': 'Basic',
    'brons': 'Bronze',
    'silver': 'Silver',
    'guld': 'Gold',
    'admin': 'Admin',
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
export function getNextLevelInfo(currentPoints: number, currentLevel: MembershipLevel) {
  if (currentLevel === 'admin') {
    return null; // Admin is max level
  }

  const levels: MembershipLevel[] = ['basic', 'brons', 'silver', 'guld'];
  const currentIndex = levels.indexOf(currentLevel);

  if (currentIndex === -1 || currentIndex === levels.length - 1) {
    return null;
  }

  const nextLevel = levels[currentIndex + 1];
  const nextLevelInfo = LEVEL_THRESHOLDS[nextLevel as keyof typeof LEVEL_THRESHOLDS];
  const pointsNeeded = nextLevelInfo.min - currentPoints;

  return {
    level: nextLevel,
    name: getLevelDisplayName(nextLevel),
    pointsNeeded: Math.max(0, pointsNeeded),
    minPoints: nextLevelInfo.min,
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
      .from('order_reservations')
      .select('pallet_id')
      .eq('user_id', userId)
      .not('pallet_id', 'is', null);

    if (error) throw error;

    // Get unique pallet count
    const uniquePallets = new Set(data.map(r => r.pallet_id));
    return uniquePallets.size;
  } catch (error) {
    console.error('Error checking pallet milestone:', error);
    return 0;
  }
}

/**
 * Manual IP adjustment (admin only)
 */
export async function adjustImpactPoints(
  userId: string,
  pointsChange: number,
  description: string
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  const sb = getSupabaseAdmin();

  try {
    const { data, error } = await sb.rpc('award_impact_points', {
      p_user_id: userId,
      p_event_type: 'manual_adjustment',
      p_points: pointsChange,
      p_description: description,
    });

    if (error) throw error;

    return { success: true, newTotal: data };
  } catch (error) {
    console.error('Error adjusting impact points:', error);
    return { success: false, newTotal: 0, error: error.message };
  }
}

