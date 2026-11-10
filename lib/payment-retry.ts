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
  chargeCreatedAfterIso,
  isChargeEligible,
} from "@/lib/legal/charge-eligibility";
import {
  sendPaymentCancelledEmail,
  sendPaymentConfirmedEmail,
} from "@/lib/sendgrid-service";
import { createPalletClosePaymentLink } from "@/lib/checkout/pallet-close/payment-link";
import { resolveAmountOre } from "@/lib/checkout/pallet-close/resolve-amount-ore";
import {
  decidePaymentRetrySchedule,
  PAYMENT_RETRY_INTERVAL_MS,
  PAYMENT_RETRY_PAY_WINDOW_MS,
  paymentRetryMayWritePayWindow,
  resolvePaymentRetryPayWindow,
} from "@/lib/payment-retry-window";

export {
  decidePaymentRetrySchedule,
  PAYMENT_RETRY_INTERVAL_MS,
  PAYMENT_RETRY_PAY_WINDOW_MS,
  paymentRetryMayWritePayWindow,
  resolvePaymentRetryPayWindow,
} from "@/lib/payment-retry-window";

const CANCELLATION_REASON_DB = "Payment failed after pay window expired";
const CANCELLATION_REASON_EMAIL =
  "Payment was not completed within 3 days of the failed charge.";

export type SchedulePaymentRetryResult = {
  action: "scheduled" | "cancelled" | "skipped";
  payByAt?: string;
  /** True only when this call opened a new 3-day window (send failed-charge email once). */
  windowOpened?: boolean;
  /** Stripe Checkout URL for paying / updating card — only set when windowOpened. */
  paymentLinkUrl?: string;
};

/**
 * After a failed charge, schedule the next retry or cancel after the 3-day window.
 * attemptNumber is kept for call-site compatibility; the window is time-based.
 *
 * Never writes offsession_* when pallet-close owns pay_link_pending/charging.
 * Opens the window (and creates a pay link) only once — subsequent failures reuse
 * the same pay-by date and do not re-open.
 */
export async function schedulePaymentRetry(
  reservationId: string,
  _attemptNumber: number,
): Promise<SchedulePaymentRetryResult> {
  const sb = getSupabaseAdmin();
  const now = new Date();

  const { data: existing } = await sb
    .from("order_reservations")
    .select(
      "status, archived_at, cancelled_at, offsession_charge_failed_at, offsession_pay_by, offsession_payment_link_url, pallet_close_state, pallet_id",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (
    existing &&
    (String(existing.status) === "archived" ||
      existing.archived_at != null ||
      existing.cancelled_at != null ||
      String(existing.status) === "cancelled")
  ) {
    return { action: "skipped" };
  }

  const window = resolvePaymentRetryPayWindow({
    now,
    palletCloseState: existing?.pallet_close_state,
    existingFailedAt: existing?.offsession_charge_failed_at,
    existingPayBy: existing?.offsession_pay_by,
  });

  if (window.kind === "skip_owned_by_pallet_close") {
    // Pallet-close cron owns timeout + pay-link email for this reservation.
    return { action: "skipped" };
  }

  let paymentLinkUrl: string | undefined;
  if (window.kind === "open") {
    if (!paymentRetryMayWritePayWindow(existing?.pallet_close_state)) {
      return { action: "skipped" };
    }
    // Conditional write: never overwrite an existing pay-by (race with pallet-close).
    const { data: written, error: windowErr } = await sb
      .from("order_reservations")
      .update({
        offsession_charge_failed_at: window.windowStartedAt.toISOString(),
        offsession_pay_by: window.payByAt.toISOString(),
      })
      .eq("id", reservationId)
      .is("offsession_pay_by", null)
      .neq("status", "archived")
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (windowErr) {
      console.error(
        `[RETRY] schedulePaymentRetry set pay window reservation_id=${reservationId}:`,
        windowErr.message,
      );
      return { action: "skipped" };
    }
    if (!written) {
      // Another writer (e.g. pallet-close) set the window first — reload and reuse.
      const { data: again } = await sb
        .from("order_reservations")
        .select(
          "offsession_charge_failed_at, offsession_pay_by, offsession_payment_link_url, pallet_close_state",
        )
        .eq("id", reservationId)
        .maybeSingle();
      const reused = resolvePaymentRetryPayWindow({
        now,
        palletCloseState: again?.pallet_close_state,
        existingFailedAt: again?.offsession_charge_failed_at,
        existingPayBy: again?.offsession_pay_by,
      });
      if (reused.kind === "skip_owned_by_pallet_close") {
        return { action: "skipped" };
      }
      if (reused.kind === "reuse") {
        const decision = decidePaymentRetrySchedule({
          now,
          windowStartedAt: reused.windowStartedAt,
        });
        if (decision.action === "cancel") {
          await cancelFailedReservation(reservationId);
          return {
            action: "cancelled",
            payByAt: decision.payByAt.toISOString(),
            windowOpened: false,
          };
        }
        await sb
          .from("order_reservations")
          .update({ retry_scheduled_at: decision.at.toISOString() })
          .eq("id", reservationId)
          .neq("status", "archived")
          .is("archived_at", null);
        return {
          action: "scheduled",
          payByAt: decision.payByAt.toISOString(),
          windowOpened: false,
          paymentLinkUrl:
            typeof again?.offsession_payment_link_url === "string"
              ? again.offsession_payment_link_url
              : undefined,
        };
      }
      return { action: "skipped" };
    }

    // Create a real Stripe Checkout pay link (profile#payment only manages cards).
    const amountOre = await resolveAmountOre(reservationId);
    if (amountOre != null && amountOre > 0) {
      const link = await createPalletClosePaymentLink({
        reservationId,
        amountOre,
        palletId:
          typeof existing?.pallet_id === "string" ? existing.pallet_id : null,
      });
      if (link.ok) paymentLinkUrl = link.url;
    }
  } else if (
    typeof existing?.offsession_payment_link_url === "string" &&
    existing.offsession_payment_link_url.trim()
  ) {
    paymentLinkUrl = existing.offsession_payment_link_url.trim();
  }

  const decision = decidePaymentRetrySchedule({
    now,
    windowStartedAt: window.windowStartedAt,
  });

  if (decision.action === "cancel") {
    await cancelFailedReservation(reservationId);
    return {
      action: "cancelled",
      payByAt: decision.payByAt.toISOString(),
      windowOpened: false,
    };
  }

  const { error } = await sb
    .from("order_reservations")
    .update({ retry_scheduled_at: decision.at.toISOString() })
    .eq("id", reservationId)
    .neq("status", "archived")
    .is("archived_at", null);

  if (error) {
    console.error(
      `[RETRY] schedulePaymentRetry reservation_id=${reservationId}:`,
      error.message,
    );
  }

  return {
    action: "scheduled",
    payByAt: decision.payByAt.toISOString(),
    windowOpened: window.windowOpened === true,
    paymentLinkUrl,
  };
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

  if (String(row.status) === "archived") {
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

  if (palletId) {
    try {
      const { syncPalletShipReadiness } = await import(
        "@/lib/pallet-completion"
      );
      await syncPalletShipReadiness(palletId);
    } catch (e) {
      console.error(
        `[RETRY] cancelFailedReservation sync ship readiness pallet=${palletId}:`,
        e,
      );
    }
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
  let locale: "sv" | "en" = "sv";
  if (userId) {
    const { data: prof } = await sb
      .from("profiles")
      .select("email, preferred_locale")
      .eq("id", userId)
      .maybeSingle();
    const em = prof?.email;
    if (typeof em === "string" && em.includes("@")) {
      toEmail = em.trim();
    }
    if (
      typeof prof?.preferred_locale === "string" &&
      prof.preferred_locale.toLowerCase().startsWith("en")
    ) {
      locale = "en";
    }
  }

  if (toEmail) {
    try {
      await sendPaymentCancelledEmail({
        to: toEmail,
        reservationId,
        reason: CANCELLATION_REASON_EMAIL,
        locale,
      });
    } catch (e) {
      console.error(
        `[RETRY] cancelFailedReservation email reservation_id=${reservationId}:`,
        e,
      );
    }
  }

  console.log(
    `[RETRY] Reservation ${reservationId} cancelled after 3-day pay window`,
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

    const now = new Date();
    const createdAfter = chargeCreatedAfterIso(now);

    const { data: skippedSource } = await sb
      .from("order_reservations")
      .select(
        "id, terms_version, terms_accepted_at, age_verified_at, created_at",
      )
      .eq("payment_status", "failed")
      .not("retry_scheduled_at", "is", null)
      .lte("retry_scheduled_at", nowIso)
      .eq("payment_mode", "setup_intent")
      .eq("is_conditional", false)
      .is("charge_blocked_reason", null)
      .not("payment_method_id", "is", null)
      .neq("status", "cancelled")
      .neq("status", "confirmed")
      .neq("status", "archived")
      .is("archived_at", null);

    for (const raw of skippedSource ?? []) {
      const decision = isChargeEligible(raw, now);
      if (decision.ok) continue;
      const skippedId = typeof raw.id === "string" ? raw.id : "";
      if (!skippedId) continue;
      console.log(
        `[RETRY] skipping reservation_id=${skippedId} reason=${decision.reason}`,
      );
    }

    const { data: rows, error } = await sb
      .from("order_reservations")
      .select(
        "id, user_id, pallet_id, payment_mode, payment_status, payment_method_id, setup_intent_id, payment_attempts, status, is_conditional, charge_blocked_reason, terms_version, terms_accepted_at, age_verified_at, created_at",
      )
      .eq("payment_status", "failed")
      .not("retry_scheduled_at", "is", null)
      .lte("retry_scheduled_at", nowIso)
      .eq("payment_mode", "setup_intent")
      .eq("is_conditional", false)
      .is("charge_blocked_reason", null)
      .not("payment_method_id", "is", null)
      .neq("status", "cancelled")
      .neq("status", "confirmed")
      .neq("status", "archived")
      .is("archived_at", null)
      .not("terms_version", "is", null)
      .not("terms_accepted_at", "is", null)
      .not("age_verified_at", "is", null)
      .gt("created_at", createdAfter);

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
            "id, user_id, pallet_id, payment_mode, payment_status, payment_method_id, setup_intent_id, payment_attempts, status, terms_version, terms_accepted_at, age_verified_at, created_at, is_conditional, charge_blocked_reason",
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

        if (fresh.is_conditional === true) {
          console.log(
            `[RETRY] Skipping conditional reservation: legal/logistics review required. reservation_id=${id}`,
          );
          continue;
        }
        if (
          fresh.charge_blocked_reason != null &&
          String(fresh.charge_blocked_reason).trim() !== ""
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
          is_conditional: fresh.is_conditional as boolean | null | undefined,
          charge_blocked_reason:
            typeof fresh.charge_blocked_reason === "string"
              ? fresh.charge_blocked_reason
              : null,
          terms_version:
            typeof fresh.terms_version === "string" ? fresh.terms_version : null,
          terms_accepted_at:
            typeof fresh.terms_accepted_at === "string"
              ? fresh.terms_accepted_at
              : null,
          age_verified_at:
            typeof fresh.age_verified_at === "string"
              ? fresh.age_verified_at
              : null,
          created_at:
            typeof fresh.created_at === "string" ? fresh.created_at : null,
        };

        const outcome = await chargeOneSetupIntentReservation(
          palletId,
          chargeRow,
        );

        if (typeof outcome === "object") {
          continue;
        }

        attempted += 1;

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
          const scheduled = await schedulePaymentRetry(id, attempts);
          if (scheduled.action === "cancelled") cancelled += 1;
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
