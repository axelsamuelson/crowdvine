import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { chargeOneSetupIntentReservation } from "@/lib/reservation-auto-charge";
import type { ReservationChargeRow } from "@/lib/reservation-auto-charge";
import {
  cleanupEmptyPalletsAfterReservationChange,
  releaseBookingsForReservationPallet,
  updatePickupProducerForPallet,
} from "@/lib/pallet-auto-management";
import {
  confirmPendingRedemption,
  reversePendingRedemption,
} from "@/lib/membership/pact-points-engine";
import { stripe } from "@/lib/stripe";
import {
  sendPaymentCancelledEmail,
  sendPaymentConfirmedEmail,
} from "@/lib/sendgrid-service";

const CANCELLATION_REASON_DB = "Payment failed after maximum retries";
const CANCELLATION_REASON_EMAIL =
  "Your card could not be charged after multiple attempts.";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_72H = 72 * 60 * 60 * 1000;

/**
 * After a failed charge, schedule the next retry or cancel after max attempts.
 * attemptNumber is payment_attempts after the failure (1 = first failure → 24h).
 */
export async function schedulePaymentRetry(
  reservationId: string,
  attemptNumber: number,
): Promise<void> {
  if (attemptNumber >= 3) {
    await cancelFailedReservation(reservationId);
    return;
  }

  const ms = attemptNumber >= 2 ? MS_72H : MS_24H;
  const when = new Date(Date.now() + ms).toISOString();

  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("order_reservations")
    .update({ retry_scheduled_at: when })
    .eq("id", reservationId);

  if (error) {
    console.error(
      `[RETRY] schedulePaymentRetry reservation_id=${reservationId}:`,
      error.message,
    );
  }
}

export async function cancelFailedReservation(
  reservationId: string,
): Promise<void> {
  const sb = getSupabaseAdmin();

  const { data: row, error: loadErr } = await sb
    .from("order_reservations")
    .select(
      "id, user_id, pallet_id, shipping_region_id, delivery_zone_id, status, cancelled_at",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (loadErr) {
    console.error(
      `[RETRY] cancelFailedReservation load reservation_id=${reservationId}:`,
      loadErr.message,
    );
    return;
  }

  if (!row) {
    console.warn(
      `[RETRY] cancelFailedReservation reservation_id=${reservationId} not found`,
    );
    return;
  }

  if (row.cancelled_at != null || String(row.status) === "cancelled") {
    return;
  }

  const palletId =
    typeof row.pallet_id === "string" && row.pallet_id.trim() !== ""
      ? row.pallet_id.trim()
      : null;
  const deliveryZoneId =
    typeof row.delivery_zone_id === "string" &&
    row.delivery_zone_id.trim() !== ""
      ? row.delivery_zone_id.trim()
      : null;
  const shippingRegionId =
    typeof row.shipping_region_id === "string" &&
    row.shipping_region_id.trim() !== ""
      ? row.shipping_region_id.trim()
      : null;

  const snapshot = {
    pallet_id: palletId,
    delivery_zone_id: deliveryZoneId,
    shipping_region_id: shippingRegionId,
  };

  if (palletId) {
    await releaseBookingsForReservationPallet(reservationId, palletId);
  }

  const now = new Date().toISOString();
  const { error: upErr } = await sb
    .from("order_reservations")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: CANCELLATION_REASON_DB,
      pallet_id: null,
      retry_scheduled_at: null,
    })
    .eq("id", reservationId);

  if (upErr) {
    console.error(
      `[RETRY] cancelFailedReservation update reservation_id=${reservationId}:`,
      upErr.message,
    );
    return;
  }

  const reverseResult = await reversePendingRedemption(reservationId);
  if (!reverseResult.success) {
    console.error(
      `[RETRY] cancelFailedReservation reversePendingRedemption reservation_id=${reservationId}:`,
      reverseResult.error,
    );
  }

  try {
    await cleanupEmptyPalletsAfterReservationChange(snapshot);
  } catch (e) {
    console.error(
      `[RETRY] cancelFailedReservation cleanup reservation_id=${reservationId}:`,
      e,
    );
  }

  if (palletId) {
    try {
      await updatePickupProducerForPallet(palletId);
    } catch (e) {
      console.error(
        `[RETRY] cancelFailedReservation pickup reservation_id=${reservationId}:`,
        e,
      );
    }
  }

  const userId = typeof row.user_id === "string" ? row.user_id : null;
  let toEmail: string | null = null;
  if (userId) {
    const { data: prof } = await sb
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const em = prof?.email;
    if (typeof em === "string" && em.includes("@")) {
      toEmail = em.trim();
    }
  }

  if (toEmail) {
    try {
      await sendPaymentCancelledEmail({
        to: toEmail,
        reservationId,
        reason: CANCELLATION_REASON_EMAIL,
      });
    } catch (e) {
      console.error(
        `[RETRY] cancelFailedReservation email reservation_id=${reservationId}:`,
        e,
      );
    }
  }

  console.log(
    `[RETRY] Reservation ${reservationId} cancelled after max payment retries`,
  );
}

export async function retryFailedPayments(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  cancelled: number;
}> {
  const empty = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
  };

  try {
    const sb = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: rows, error } = await sb
      .from("order_reservations")
      .select(
        "id, user_id, pallet_id, payment_mode, payment_status, payment_method_id, setup_intent_id, payment_attempts, status",
      )
      .eq("payment_status", "failed")
      .not("retry_scheduled_at", "is", null)
      .lte("retry_scheduled_at", nowIso)
      .eq("payment_mode", "setup_intent")
      .not("payment_method_id", "is", null)
      .neq("status", "cancelled")
      .neq("status", "confirmed");

    if (error) {
      console.error("[RETRY] retryFailedPayments query:", error.message);
      return empty;
    }

    const list = rows ?? [];
    let attempted = 0;
    let succeeded = 0;
    let failed = 0;
    let cancelled = 0;

    for (const raw of list) {
      try {
        const id = typeof raw.id === "string" ? raw.id : null;
        if (!id) continue;

        const { data: fresh, error: freshErr } = await sb
          .from("order_reservations")
          .select(
            "id, user_id, pallet_id, payment_mode, payment_status, payment_method_id, setup_intent_id, payment_attempts, status",
          )
          .eq("id", id)
          .maybeSingle();

        if (freshErr || !fresh) continue;

        if (
          String(fresh.payment_status) === "paid" ||
          String(fresh.status) === "cancelled" ||
          String(fresh.status) === "confirmed"
        ) {
          continue;
        }

        const palletId =
          typeof fresh.pallet_id === "string" && fresh.pallet_id.trim() !== ""
            ? fresh.pallet_id.trim()
            : null;
        if (!palletId) {
          failed += 1;
          continue;
        }

        const chargeRow: ReservationChargeRow = {
          id: fresh.id,
          user_id: fresh.user_id as string,
          payment_mode:
            typeof fresh.payment_mode === "string" ? fresh.payment_mode : null,
          payment_status:
            typeof fresh.payment_status === "string"
              ? fresh.payment_status
              : null,
          payment_method_id:
            typeof fresh.payment_method_id === "string"
              ? fresh.payment_method_id
              : null,
          setup_intent_id:
            typeof fresh.setup_intent_id === "string"
              ? fresh.setup_intent_id
              : null,
          payment_attempts:
            typeof fresh.payment_attempts === "number"
              ? fresh.payment_attempts
              : fresh.payment_attempts != null
                ? Number(fresh.payment_attempts)
                : null,
        };

        attempted += 1;
        const outcome = await chargeOneSetupIntentReservation(
          palletId,
          chargeRow,
        );

        if (outcome === "charged") {
          const { error: statusErr } = await sb
            .from("order_reservations")
            .update({ status: "confirmed", retry_scheduled_at: null })
            .eq("id", id);

          if (statusErr) {
            console.error(
              `[RETRY] retryFailedPayments confirm status reservation_id=${id}:`,
              statusErr.message,
            );
          }

          const confirmResult = await confirmPendingRedemption(id);
          if (!confirmResult.success) {
            console.error(
              `[RETRY] retryFailedPayments confirmPendingRedemption reservation_id=${id}:`,
              confirmResult.error,
            );
          }

          const userId =
            typeof fresh.user_id === "string" ? fresh.user_id : null;
          let toEmail: string | null = null;
          if (userId) {
            const { data: prof } = await sb
              .from("profiles")
              .select("email")
              .eq("id", userId)
              .maybeSingle();
            const em = prof?.email;
            if (typeof em === "string" && em.includes("@")) {
              toEmail = em.trim();
            }
          }

          let palletName = "Your pallet";
          const { data: pal } = await sb
            .from("pallets")
            .select("name")
            .eq("id", palletId)
            .maybeSingle();
          if (
            pal?.name &&
            typeof pal.name === "string" &&
            pal.name.trim() !== ""
          ) {
            palletName = pal.name.trim();
          }

          const { data: piRow } = await sb
            .from("order_reservations")
            .select("payment_intent_id")
            .eq("id", id)
            .maybeSingle();
          const piId =
            piRow &&
            typeof piRow.payment_intent_id === "string" &&
            piRow.payment_intent_id.trim() !== ""
              ? piRow.payment_intent_id.trim()
              : null;

          let amountSek = 0;
          if (piId && stripe) {
            try {
              const pi = await stripe.paymentIntents.retrieve(piId);
              amountSek = Math.round((pi.amount ?? 0) / 100);
            } catch (e) {
              console.warn(
                `[RETRY] retryFailedPayments PI amount reservation_id=${id}:`,
                e,
              );
            }
          }

          if (toEmail) {
            try {
              await sendPaymentConfirmedEmail({
                to: toEmail,
                reservationId: id,
                amountSek,
                palletName,
              });
            } catch (e) {
              console.error(
                `[RETRY] retryFailedPayments email reservation_id=${id}:`,
                e,
              );
            }
          }

          succeeded += 1;
        } else if (outcome === "failed") {
          const { data: after } = await sb
            .from("order_reservations")
            .select("payment_attempts")
            .eq("id", id)
            .maybeSingle();
          const attempts = Number(after?.payment_attempts) || 0;
          await schedulePaymentRetry(id, attempts);
          if (attempts >= 3) cancelled += 1;
          else failed += 1;
        } else {
          failed += 1;
        }
      } catch (rowErr) {
        console.error("[RETRY] retryFailedPayments row:", rowErr);
      }
    }

    return { attempted, succeeded, failed, cancelled };
  } catch (e) {
    console.error("[RETRY] retryFailedPayments:", e);
    return empty;
  }
}
