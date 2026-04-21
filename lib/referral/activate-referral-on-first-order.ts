import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REFERRAL_ACTIVATION_WINDOW_DAYS,
  REFERRAL_MIN_BOTTLES_FIRST_ORDER,
} from "@/lib/referral/constants";

async function hadPriorQualifyingOrder(
  sb: SupabaseClient,
  userId: string,
  excludeReservationId: string,
): Promise<boolean> {
  const { data: resRows, error } = await sb
    .from("order_reservations")
    .select("id")
    .eq("user_id", userId)
    .neq("id", excludeReservationId);

  if (error || !resRows?.length) {
    return false;
  }

  const ids = resRows.map((r) => r.id as string);
  const { data: items, error: itemsErr } = await sb
    .from("order_reservation_items")
    .select("reservation_id, quantity")
    .in("reservation_id", ids);

  if (itemsErr || !items?.length) {
    return false;
  }

  const sumByRes = new Map<string, number>();
  for (const row of items) {
    const rid = String(row.reservation_id);
    sumByRes.set(
      rid,
      (sumByRes.get(rid) || 0) + (Number(row.quantity) || 0),
    );
  }

  for (const qty of sumByRes.values()) {
    if (qty >= REFERRAL_MIN_BOTTLES_FIRST_ORDER) {
      return true;
    }
  }
  return false;
}

/**
 * After a successful checkout, if this user was referred and this is their first
 * qualifying case (6+ bottles) within REFERRAL_ACTIVATION_WINDOW_DAYS of signup,
 * set referral_signups.referral_activated_at.
 *
 * Voucher creation for inviter + invitee is intentionally not implemented here —
 * wire discount_codes / Shopify when product confirms the reward model.
 */
export async function tryActivateReferralOnFirstOrder(params: {
  sb: SupabaseClient;
  userId: string;
  reservationId: string;
  totalBottles: number;
}): Promise<{ activated: boolean }> {
  const { sb, userId, reservationId, totalBottles } = params;

  if (totalBottles < REFERRAL_MIN_BOTTLES_FIRST_ORDER) {
    return { activated: false };
  }

  if (await hadPriorQualifyingOrder(sb, userId, reservationId)) {
    return { activated: false };
  }

  const { data: signup, error } = await sb
    .from("referral_signups")
    .select("id, signed_up_at, referral_activated_at")
    .eq("invitee_id", userId)
    .maybeSingle();

  if (error || !signup || signup.referral_activated_at) {
    return { activated: false };
  }

  const signedUp = new Date(signup.signed_up_at);
  const deadline = new Date(signedUp);
  deadline.setDate(deadline.getDate() + REFERRAL_ACTIVATION_WINDOW_DAYS);
  if (Date.now() > deadline.getTime()) {
    return { activated: false };
  }

  const { error: updErr } = await sb
    .from("referral_signups")
    .update({
      referral_activated_at: new Date().toISOString(),
      first_order_reservation_id: reservationId,
    })
    .eq("id", signup.id)
    .is("referral_activated_at", null);

  if (updErr) {
    console.error("[referral] failed to activate referral_signups", updErr);
    return { activated: false };
  }

  return { activated: true };
}
