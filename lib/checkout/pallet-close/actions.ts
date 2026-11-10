/**
 * Customer choice actions (wait / cancel / switch_direct) after token consume.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { applyPalletCloseTransition } from "@/lib/checkout/pallet-close/state-machine";
import { cancelReservationAndDetachPaymentMethod } from "@/lib/checkout/pallet-close/cancel";
import {
  EXTENSION_DAYS,
  type PalletCloseReservationSnapshot,
} from "@/lib/checkout/pallet-close/types";
import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";
import { sendPalletCloseCancelledEmailOnce } from "@/lib/checkout/pallet-close/send";

function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function loadSnapshot(
  reservationId: string,
): Promise<PalletCloseReservationSnapshot | null> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("order_reservations")
    .select(
      "id, pallet_id, payment_status, payment_method_id, setup_intent_id, payment_intent_id, status, cancelled_at, charge_deadline_at, pallet_close_state, pallet_close_choice, pallet_close_choice_sent_at, pallet_close_choice_reply_by, pallet_close_extension_count, offsession_charge_failed_at, offsession_pay_by, payment_method_detached_at, pallet_close_charge_idempotency_key",
    )
    .eq("id", reservationId)
    .maybeSingle();
  return (data as PalletCloseReservationSnapshot | null) ?? null;
}

export async function applyPalletCloseWait(opts: {
  reservationId: string;
  now?: Date;
}): Promise<{ ok: boolean; reason?: string; newDeadlineAt?: string }> {
  const now = opts.now ?? new Date();
  const row = await loadSnapshot(opts.reservationId);
  if (!row) return { ok: false, reason: "not_found" };

  const newDeadlineIso = addDaysIso(now, EXTENSION_DAYS);
  const transition = applyPalletCloseTransition(row, {
    type: "choice_wait",
    nowIso: now.toISOString(),
    newDeadlineIso,
  });
  if (!transition.ok) return { ok: false, reason: transition.reason };

  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("order_reservations")
    .update(transition.next)
    .eq("id", row.id)
    .eq("pallet_close_state", "choice_pending");

  if (error) return { ok: false, reason: error.message };

  await sb.from("pallet_close_events").insert({
    reservation_id: row.id,
    pallet_id: row.pallet_id,
    event: "choice_wait",
    meta: { new_deadline_at: newDeadlineIso },
  });

  return { ok: true, newDeadlineAt: newDeadlineIso };
}

export async function applyPalletCloseCancel(opts: {
  reservationId: string;
  now?: Date;
}): Promise<{ ok: boolean; reason?: string }> {
  const now = opts.now ?? new Date();
  const row = await loadSnapshot(opts.reservationId);
  if (!row) return { ok: false, reason: "not_found" };

  // Already cancelled — idempotent success.
  if (row.cancelled_at) return { ok: true };

  // Axel 2026-11-10: free cancel until the pallet closes / charge succeeds.
  // Allow from choice_pending and from open/extended/null while unpaid.
  if (String(row.payment_status) === "paid") {
    return { ok: false, reason: "already_paid" };
  }

  const transition = applyPalletCloseTransition(row, {
    type: "choice_cancel",
    nowIso: now.toISOString(),
  });
  // choice_cancel only validates from choice_pending; other unpaid states
  // still cancel free of charge (status status-email cancel links).
  if (
    !transition.ok &&
    transition.reason !== "terminal_state" &&
    String(row.pallet_close_state) === "choice_pending"
  ) {
    return { ok: false, reason: transition.reason };
  }

  const result = await cancelReservationAndDetachPaymentMethod({
    reservationId: row.id,
    reason: "customer_cancel",
    now,
  });
  if (!result.ok) return { ok: false, reason: result.message };

  await sendPalletCloseCancelledEmailOnce({
    reservationId: row.id,
    reason: "customer_cancel",
  });

  return { ok: true };
}

/**
 * Switch-to-direct is only allowed when DIRECT_BOX_CHECKOUT_ENABLED.
 * Returns a checkout redirect that forces a NEW direct quote + explicit
 * acceptance (never reuses the shared-pallet quote).
 */
export async function beginPalletCloseSwitchDirect(opts: {
  reservationId: string;
}): Promise<{
  ok: boolean;
  reason?: string;
  nextPath?: string;
}> {
  if (!isDirectBoxCheckoutEnabled()) {
    return { ok: false, reason: "direct_box_disabled" };
  }
  const row = await loadSnapshot(opts.reservationId);
  if (!row) return { ok: false, reason: "not_found" };
  if (String(row.pallet_close_state) !== "choice_pending") {
    return { ok: false, reason: "invalid_state" };
  }

  const sb = getSupabaseAdmin();
  await sb
    .from("order_reservations")
    .update({
      pallet_close_choice: "switch_direct",
      pallet_close_choice_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  await sb.from("pallet_close_events").insert({
    reservation_id: row.id,
    pallet_id: row.pallet_id,
    event: "choice_switch_direct_started",
    meta: { require_new_quote: true, require_explicit_acceptance: true },
  });

  // Fresh checkout session: new quote + explicit acceptance required.
  return {
    ok: true,
    nextPath: `/checkout?pallet_close_switch=${encodeURIComponent(row.id)}&fulfillment=direct_box&require_new_quote=1`,
  };
}
