import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PACT_POINTS_EXPIRY_DAYS } from "@/lib/membership/pact-points-engine";
import {
  FOUNDING_MEMBER_DOUBLE_IP,
  FOUNDING_MEMBER_MAX_COUNT,
  INVITE_QUOTAS,
  normalizeMembershipLevel,
  type MembershipLevel,
} from "@/lib/membership/points-engine";

const COMPLETED_ORDER_STATUSES = [
  "pending_producer_approval",
  "approved",
  "confirmed",
  "partly_approved",
] as const;

export type FoundingMemberGrantResult =
  | { granted: true; spotsRemaining: number }
  | { granted: false; alreadyMember: true }
  | { granted: false; spotsFull: true }
  | { granted: false; notFirstOrder: true }
  | { granted: false; error: string };

/**
 * First eligible buyers up to {@link FOUNDING_MEMBER_MAX_COUNT} become founding members.
 * Idempotent: existing `founding_member` or `founding_member_since` returns without updating.
 */
export async function checkAndGrantFoundingMember(
  userId: string,
  _reservationId: string,
): Promise<FoundingMemberGrantResult> {
  try {
    const sb = getSupabaseAdmin();

    const { data: membership, error: memError } = await sb
      .from("user_memberships")
      .select("level")
      .eq("user_id", userId)
      .maybeSingle();

    if (memError) {
      return { granted: false, error: memError.message };
    }
    if (!membership) {
      return { granted: false, error: "Membership row not found" };
    }

    if (membership.level === "founding_member") {
      return { granted: false, alreadyMember: true };
    }

    const { count: fmCountRaw, error: fmCountError } = await sb
      .from("user_memberships")
      .select("id", { count: "exact", head: true })
      .not("founding_member_since", "is", null);

    if (fmCountError) {
      return { granted: false, error: fmCountError.message };
    }

    const fmCount = fmCountRaw ?? 0;
    if (fmCount >= FOUNDING_MEMBER_MAX_COUNT) {
      return { granted: false, spotsFull: true };
    }

    const { count: orderCountRaw, error: orderCountError } = await sb
      .from("order_reservations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", [...COMPLETED_ORDER_STATUSES]);

    if (orderCountError) {
      return { granted: false, error: orderCountError.message };
    }

    const orderCount = orderCountRaw ?? 0;
    if (orderCount > 1) {
      return { granted: false, notFirstOrder: true };
    }

    const { error: updateError } = await sb
      .from("user_memberships")
      .update({
        level: "founding_member",
        founding_member_since: new Date().toISOString(),
        invite_quota_monthly: INVITE_QUOTAS.founding_member,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return { granted: false, error: updateError.message };
    }

    const { error: rpcError } = await sb.rpc("award_impact_points", {
      p_user_id: userId,
      p_event_type: "manual_adjustment",
      p_points: 0,
      p_related_order_id: _reservationId,
      p_description: "Granted Founding Member status",
    });

    if (rpcError) {
      return { granted: false, error: rpcError.message };
    }

    try {
      const { error: pactGrantErr } = await sb.rpc("award_pact_points", {
        p_user_id: userId,
        p_event_type: "founding_member_grant",
        p_points_delta: 100,
        p_bottle_count: null,
        p_related_order_id: _reservationId,
        p_related_user_id: null,
        p_description: "Founding Member welcome PACT Points bonus",
        p_expires_in_days: PACT_POINTS_EXPIRY_DAYS,
      });
      if (pactGrantErr) {
        console.error(
          "[FOUNDING] award_pact_points founding_member_grant:",
          pactGrantErr,
        );
      }
    } catch (pactEx) {
      console.error(
        "[FOUNDING] award_pact_points founding_member_grant unexpected:",
        pactEx,
      );
    }

    return {
      granted: true,
      spotsRemaining: FOUNDING_MEMBER_MAX_COUNT - (fmCount + 1),
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unknown error in checkAndGrantFoundingMember";
    return { granted: false, error: message };
  }
}

/**
 * PACT Points symmetry with {@link applyFoundingMemberDoubleIP} for IP.
 * Intentional no-op: `TIER_POINTS_MULTIPLIER.founding_member` (5×) already accelerates
 * bottle-based PACT awards in `pact-points-engine`; we do not stack an extra multiplier.
 */
export function applyFoundingMemberPactMultiplier(
  level: MembershipLevel,
  basePoints: number,
): number {
  if (level === "founding_member") {
    return basePoints;
  }
  return basePoints;
}

/** Double own-order base IP for founding members when {@link FOUNDING_MEMBER_DOUBLE_IP} is enabled. */
export function applyFoundingMemberDoubleIP(
  level: string | MembershipLevel,
  basePoints: number,
): number {
  if (!FOUNDING_MEMBER_DOUBLE_IP || basePoints <= 0) {
    return basePoints;
  }
  if (normalizeMembershipLevel(level) !== "founding_member") {
    return basePoints;
  }
  return basePoints * 2;
}
