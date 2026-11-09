/**
 * Cancel reservation at no cost and detach saved Stripe payment method.
 */

import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  cleanupEmptyPalletsAfterReservationChange,
  releaseBookingsForReservationPallet,
  updatePickupProducerForPallet,
} from "@/lib/pallet-auto-management";
import { reversePendingRedemption } from "@/lib/membership/pact-points-engine";

export type CloseCancelReason =
  | "customer_cancel"
  | "choice_timeout"
  | "pay_link_timeout"
  | "other";

export async function cancelReservationAndDetachPaymentMethod(opts: {
  reservationId: string;
  reason: CloseCancelReason;
  now?: Date;
}): Promise<{ ok: boolean; detached: boolean; message?: string }> {
  const nowIso = (opts.now ?? new Date()).toISOString();
  const sb = getSupabaseAdmin();

  const { data: row, error } = await sb
    .from("order_reservations")
    .select(
      "id, user_id, pallet_id, payment_method_id, payment_status, cancelled_at, payment_method_detached_at, shipping_region_id, delivery_zone_id",
    )
    .eq("id", opts.reservationId)
    .maybeSingle();

  if (error || !row) {
    return {
      ok: false,
      detached: false,
      message: error?.message || "not_found",
    };
  }

  if (String(row.payment_status) === "paid") {
    return { ok: false, detached: false, message: "already_paid" };
  }

  if (!row.cancelled_at) {
    await sb
      .from("order_reservations")
      .update({
        status: "cancelled",
        cancelled_at: nowIso,
        cancellation_reason: `pallet_close:${opts.reason}`,
        pallet_close_state: "closed_cancelled",
        retry_scheduled_at: null,
      })
      .eq("id", row.id)
      .neq("payment_status", "paid");
  }

  try {
    await reversePendingRedemption(String(row.id));
  } catch (e) {
    console.warn("[pallet-close] reversePendingRedemption", e);
  }

  let detached = Boolean(row.payment_method_detached_at);
  const pmId =
    typeof row.payment_method_id === "string" ? row.payment_method_id.trim() : "";

  if (!detached && pmId && stripe) {
    try {
      await stripe.paymentMethods.detach(pmId);
      detached = true;
    } catch (e) {
      // Already detached / missing is OK
      const msg = e instanceof Error ? e.message : String(e);
      if (/No such PaymentMethod|resource_missing|already been detached/i.test(msg)) {
        detached = true;
      } else {
        console.warn("[pallet-close] detach failed", msg);
      }
    }
  }

  if (detached || !pmId) {
    await sb
      .from("order_reservations")
      .update({
        payment_method_id: null,
        payment_method_detached_at: nowIso,
      })
      .eq("id", row.id);
  }

  try {
    if (row.pallet_id) {
      await releaseBookingsForReservationPallet(String(row.pallet_id));
      await updatePickupProducerForPallet(String(row.pallet_id));
    }
    await cleanupEmptyPalletsAfterReservationChange({
      pallet_id: row.pallet_id ? String(row.pallet_id) : null,
      shipping_region_id: row.shipping_region_id
        ? String(row.shipping_region_id)
        : null,
      delivery_zone_id: row.delivery_zone_id
        ? String(row.delivery_zone_id)
        : null,
    });
  } catch (e) {
    console.warn("[pallet-close] pallet cleanup", e);
  }

  await sb.from("pallet_close_events").insert({
    reservation_id: row.id,
    pallet_id: row.pallet_id,
    event: "cancelled",
    meta: { reason: opts.reason, detached },
  });

  return { ok: true, detached };
}
