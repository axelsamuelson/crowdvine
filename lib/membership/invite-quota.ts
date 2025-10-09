/**
 * PACT Wines - Invite Quota Management
 * 
 * Handles monthly invite quotas based on membership level
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { MembershipLevel, INVITE_QUOTAS } from "./points-engine";

/**
 * Get available invites for a user (quota - used this month)
 */
export async function getAvailableInvites(userId: string): Promise<{
  available: number;
  used: number;
  total: number;
  error?: string;
}> {
  const sb = getSupabaseAdmin();

  try {
    const { data: membership, error } = await sb
      .from('user_memberships')
      .select('invite_quota_monthly, invites_used_this_month')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!membership) {
      return {
        available: 0,
        used: 0,
        total: 0,
        error: 'Membership not found',
      };
    }

    const available = Math.max(
      0,
      membership.invite_quota_monthly - membership.invites_used_this_month
    );

    return {
      available,
      used: membership.invites_used_this_month,
      total: membership.invite_quota_monthly,
    };
  } catch (error) {
    console.error('Error getting available invites:', error);
    return {
      available: 0,
      used: 0,
      total: 0,
      error: error.message,
    };
  }
}

/**
 * Consume one invite quota (increment invites_used_this_month)
 */
export async function consumeInviteQuota(userId: string): Promise<{
  success: boolean;
  remaining: number;
  error?: string;
}> {
  const sb = getSupabaseAdmin();

  try {
    // First check if user has available invites
    const availableCheck = await getAvailableInvites(userId);
    if (availableCheck.available <= 0) {
      return {
        success: false,
        remaining: 0,
        error: 'No invites remaining this month',
      };
    }

    // Increment used count
    const { data, error } = await sb
      .from('user_memberships')
      .update({
        invites_used_this_month: sb.rpc('increment', { column: 'invites_used_this_month' }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('invite_quota_monthly, invites_used_this_month')
      .single();

    if (error) throw error;

    const remaining = data.invite_quota_monthly - data.invites_used_this_month;

    return {
      success: true,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    console.error('Error consuming invite quota:', error);
    return {
      success: false,
      remaining: 0,
      error: error.message,
    };
  }
}

/**
 * Reset monthly quotas for all users (to be run via cron on 1st of each month)
 */
export async function resetMonthlyQuotas(): Promise<{
  success: boolean;
  usersReset: number;
  error?: string;
}> {
  const sb = getSupabaseAdmin();

  try {
    const { error } = await sb.rpc('reset_monthly_invite_quotas');

    if (error) throw error;

    // Get count of users reset
    const { count } = await sb
      .from('user_memberships')
      .select('*', { count: 'exact', head: true });

    return {
      success: true,
      usersReset: count || 0,
    };
  } catch (error) {
    console.error('Error resetting monthly quotas:', error);
    return {
      success: false,
      usersReset: 0,
      error: error.message,
    };
  }
}

/**
 * Get time until next quota reset
 */
export function getTimeUntilReset(): {
  days: number;
  hours: number;
  resetDate: Date;
} {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diffMs = nextMonth.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return {
    days: diffDays,
    hours: diffHours,
    resetDate: nextMonth,
  };
}

/**
 * Check if user needs quota reset (if last_quota_reset is before this month)
 */
export async function checkAndResetQuotaIfNeeded(userId: string): Promise<boolean> {
  const sb = getSupabaseAdmin();

  try {
    const { data: membership, error } = await sb
      .from('user_memberships')
      .select('last_quota_reset')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!membership) return false;

    const lastReset = new Date(membership.last_quota_reset);
    const currentMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    // If last reset was before this month, reset now
    if (lastReset < currentMonth) {
      const { error: updateError } = await sb
        .from('user_memberships')
        .update({
          invites_used_this_month: 0,
          last_quota_reset: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking/resetting quota:', error);
    return false;
  }
}

