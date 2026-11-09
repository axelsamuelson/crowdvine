/**
 * Customer late-delivery cancel for full refund (30 days after close).
 * Behind isPalletCloseFlowEnabled. Stripe refund when payment_intent exists;
 * never invents charges. Idempotent on late_delivery_cancel_at / refund id.
 */

import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPalletCloseFlowEnabled } from "@/lib/checkout/pallet-close/flags";
import {
  isLateDeliveryCancelEligible,
  refundPromisedByIso,
} from "@/lib/checkout/pallet-delivery-notify/eligibility";
import {
  cleanupEmptyPalletsAfterReservationChange,
  releaseBookingsForReservationPallet,
  updatePickupProducerForPallet,
} from "@/lib/pallet-auto-management";
import { reversePendingRedemption } from "@/lib/membership/pact-points-engine";

export type LateDeliveryCancelResult =
  | {
      ok: true;
      refundId: string | null;
      refundPromisedBy: string;
      alreadyCancelled: boolean;
    }
  | { ok: false; message: string };

export async function getLateDeliveryCancelEligibility(opts: {
  reservationId: string;
  userId: string;
  now?: Date;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<{
  eligible: boolean;
  reason?: string;
  closedAt?: string | null;
  deliveryDay?: string | null;
}> {
  if (!isPalletCloseFlowEnabled(opts.env)) {
    return { eligible: false, reason: "flow_disabled" };
  }

  const sb = getSupabaseAdmin();
  const { data: row, error } = await sb
    .from("order_reservations")
    .select(
      "id, user_id, cancelled_at, late_delivery_cancel_at, payment_status, pallet_id, pallet:pallets(closed_at, delivery_day)",
    )
    .eq("id", opts.reservationId)
    .maybeSingle();

  if (error || !row) {
    return { eligible: false, reason: "not_found" };
  }
  if (String(row.user_id) !== String(opts.userId)) {
    return { eligible: false, reason: "forbidden" };
  }

  const pallet = row.pallet as
    | { closed_at?: string | null; delivery_day?: string | null }
    | { closed_at?: string | null; delivery_day?: string | null }[]
    | null;
  const p = Array.isArray(pallet) ? pallet[0] : pallet;
  const closedAt = p?.closed_at ? String(p.closed_at) : null;
  const deliveryDay = p?.delivery_day ? String(p.delivery_day) : null;

  const eligible = isLateDeliveryCancelEligible({
    closedAt,
    deliveryDay,
    cancelledAt: row.cancelled_at,
    lateDeliveryCancelAt: row.late_delivery_cancel_at,
    now: opts.now,
  });

  if (!eligible) {
    return {
      eligible: false,
      reason: "not_eligible",
      closedAt,
      deliveryDay,
    };
  }

  if (String(row.payment_status) !== "paid") {
    return {
      eligible: false,
      reason: "not_paid",
      closedAt,
      deliveryDay,
    };
  }

  return { eligible: true, closedAt, deliveryDay };
}

export async function applyLateDeliveryCancelForRefund(opts: {
  reservationId: string;
  userId: string;
  now?: Date;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<LateDeliveryCancelResult> {
  const eligibility = await getLateDeliveryCancelEligibility(opts);
  if (!eligibility.eligible) {
    const sb = getSupabaseAdmin();
    const { data: existing } = await sb
      .from("order_reservations")
      .select("late_delivery_cancel_at, late_delivery_refund_id, late_delivery_refund_promised_by")
      .eq("id", opts.reservationId)
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (existing?.late_delivery_cancel_at) {
      return {
        ok: true,
        alreadyCancelled: true,
        refundId: existing.late_delivery_refund_id
          ? String(existing.late_delivery_refund_id)
          : null,
        refundPromisedBy: existing.late_delivery_refund_promised_by
          ? String(existing.late_delivery_refund_promised_by)
          : refundPromisedByIso(opts.now ?? new Date()),
      };
    }
    return { ok: false, message: eligibility.reason || "not_eligible" };
  }

  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const promisedBy = refundPromisedByIso(now);
  const sb = getSupabaseAdmin();

  const { data: row, error } = await sb
    .from("order_reservations")
    .select(
      "id, pallet_id, payment_intent_id, payment_status, shipping_region_id, delivery_zone_id, late_delivery_cancel_at",
    )
    .eq("id", opts.reservationId)
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, message: error?.message || "not_found" };
  }

  if (row.late_delivery_cancel_at) {
    return {
      ok: true,
      alreadyCancelled: true,
      refundId: null,
      refundPromisedBy: promisedBy,
    };
  }

  let refundId: string | null = null;
  const piId =
    typeof row.payment_intent_id === "string"
      ? row.payment_intent_id.trim()
      : "";

  if (piId && stripe) {
    try {
      const refund = await stripe.refunds.create(
        { payment_intent: piId },
        { idempotencyKey: `late-delivery-refund:${opts.reservationId}` },
      );
      refundId = refund.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Already refunded is OK — treat as success with marker.
      if (/already been refunded|charge_already_refunded/i.test(msg)) {
        refundId = `already_refunded:${piId}`;
      } else {
        console.error("[late-delivery-cancel] stripe refund failed", msg);
        return { ok: false, message: "refund_failed" };
      }
    }
  } else if (piId && !stripe) {
    // Test / no Stripe — mark local refund intent without calling provider.
    refundId = `local_pending:${piId}`;
  } else {
    return { ok: false, message: "missing_payment_intent" };
  }

  await sb
    .from("order_reservations")
    .update({
      status: "cancelled",
      cancelled_at: nowIso,
      cancellation_reason: "late_delivery_cancel_full_refund",
      // Keep payment_status=paid; refund tracked via late_delivery_refund_id
      // (DB check historically: pending|paid|failed|expired — see migration 049).
      late_delivery_cancel_at: nowIso,
      late_delivery_refund_id: refundId,
      late_delivery_refund_promised_by: promisedBy,
      retry_scheduled_at: null,
    })
    .eq("id", row.id);

  try {
    await reversePendingRedemption(String(row.id));
  } catch (e) {
    console.warn("[late-delivery-cancel] reversePendingRedemption", e);
  }

  try {
    if (row.pallet_id) {
      await releaseBookingsForReservationPallet(
        String(row.id),
        String(row.pallet_id),
      );
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
    console.warn("[late-delivery-cancel] pallet cleanup", e);
  }

  return {
    ok: true,
    alreadyCancelled: false,
    refundId,
    refundPromisedBy: promisedBy,
  };
}
