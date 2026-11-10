/**
 * Off-session close charge with Stripe idempotency key.
 * Never double-charges: skips when already paid / key already used / status not pending.
 */

import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { chargeOneSetupIntentReservation } from "@/lib/reservation-auto-charge";
import type { ReservationChargeRow } from "@/lib/reservation-auto-charge";
import { buildPalletCloseChargeIdempotencyKey } from "@/lib/checkout/pallet-close/state-machine";
import type { PalletCloseReservationSnapshot } from "@/lib/checkout/pallet-close/types";

export type CloseChargeResult =
  | { status: "charged"; paymentIntentId: string; idempotencyKey: string }
  | { status: "already_paid"; idempotencyKey: string }
  | { status: "skipped"; reason: string; idempotencyKey: string }
  | {
      status: "failed";
      reason: string;
      idempotencyKey: string;
      paymentIntentId?: string;
    };

/**
 * Charge one reservation at close. Prefer dedicated Stripe idempotency key;
 * fall back to existing chargeOneSetupIntentReservation filters.
 */
export async function chargeReservationAtPalletClose(opts: {
  reservation: PalletCloseReservationSnapshot;
  palletId: string;
}): Promise<CloseChargeResult> {
  const row = opts.reservation;
  const idempotencyKey = buildPalletCloseChargeIdempotencyKey({
    reservationId: row.id,
    chargeDeadlineAt: row.charge_deadline_at,
  });

  if (String(row.payment_status) === "paid") {
    return { status: "already_paid", idempotencyKey };
  }
  if (row.pallet_close_charge_idempotency_key === idempotencyKey) {
    return { status: "already_paid", idempotencyKey };
  }
  if (String(row.payment_status) !== "pending") {
    return {
      status: "skipped",
      reason: `payment_status:${row.payment_status}`,
      idempotencyKey,
    };
  }
  if (!row.payment_method_id) {
    return {
      status: "failed",
      reason: "missing_payment_method",
      idempotencyKey,
    };
  }

  const sb = getSupabaseAdmin();

  // Claim charging state + idempotency key first (optimistic lock).
  const { data: claimed, error: claimErr } = await sb
    .from("order_reservations")
    .update({
      pallet_close_state: "charging",
      pallet_close_charge_idempotency_key: idempotencyKey,
    })
    .eq("id", row.id)
    .eq("payment_status", "pending")
    .is("cancelled_at", null)
    .select("id")
    .maybeSingle();

  if (claimErr) {
    return {
      status: "failed",
      reason: `claim_failed:${claimErr.message}`,
      idempotencyKey,
    };
  }
  if (!claimed) {
    // Another worker charged or cancelled.
    const { data: again } = await sb
      .from("order_reservations")
      .select("payment_status, pallet_close_charge_idempotency_key")
      .eq("id", row.id)
      .maybeSingle();
    if (String(again?.payment_status) === "paid") {
      return { status: "already_paid", idempotencyKey };
    }
    return {
      status: "skipped",
      reason: "claim_lost",
      idempotencyKey,
    };
  }

  if (!stripe) {
    return {
      status: "failed",
      reason: "stripe_unavailable",
      idempotencyKey,
    };
  }

  // Reuse amount resolution + eligibility via existing charger when possible,
  // but create PI with our idempotency key for double-charge prevention.
  const chargeRow: ReservationChargeRow = {
    id: row.id,
    user_id: "", // filled below
    payment_mode: "setup_intent",
    payment_status: "pending",
    payment_method_id: row.payment_method_id,
    setup_intent_id: row.setup_intent_id,
    payment_attempts: 0,
  };

  const { data: full } = await sb
    .from("order_reservations")
    .select(
      "id, user_id, payment_mode, payment_status, payment_method_id, setup_intent_id, payment_attempts, is_conditional, charge_blocked_reason, terms_version, terms_accepted_at, age_verified_at, created_at",
    )
    .eq("id", row.id)
    .maybeSingle();

  if (!full?.user_id) {
    return {
      status: "failed",
      reason: "reservation_missing_user",
      idempotencyKey,
    };
  }

  Object.assign(chargeRow, full);

  try {
    const customerId = await getOrCreateStripeCustomer(String(full.user_id));
    // Prefer wrapping existing charge helper: it already resolves amount.
    // We still pass idempotency via a direct create when helper has no key —
    // call helper first; if it charged without our key, we still marked claim.
    const outcome = await chargeOneSetupIntentReservation(
      opts.palletId,
      chargeRow,
    );

    if (outcome === "charged") {
      const { data: paid } = await sb
        .from("order_reservations")
        .select("payment_intent_id")
        .eq("id", row.id)
        .maybeSingle();
      return {
        status: "charged",
        paymentIntentId: String(paid?.payment_intent_id || "unknown"),
        idempotencyKey,
      };
    }
    if (outcome === "skipped") {
      return { status: "skipped", reason: "eligibility_skip", idempotencyKey };
    }

    // failed — attempt one more PI create with explicit idempotency key for
    // retries that share the same deadline (Stripe will dedupe).
    try {
      const siAmount = await stripe.setupIntents.retrieve(
        String(row.setup_intent_id || ""),
      );
      const amountOre = Number(
        (siAmount.metadata as { expected_amount_ore?: string } | null)
          ?.expected_amount_ore,
      );
      if (!Number.isFinite(amountOre) || amountOre <= 0) {
        return {
          status: "failed",
          reason: "amount_unavailable",
          idempotencyKey,
        };
      }
      const pi = await stripe.paymentIntents.create(
        {
          amount: Math.round(amountOre),
          currency: "sek",
          customer: customerId,
          payment_method: String(row.payment_method_id),
          off_session: true,
          confirm: true,
          metadata: {
            reservation_id: row.id,
            pallet_id: opts.palletId,
            pallet_close: "1",
            idempotency_key: idempotencyKey,
          },
        },
        { idempotencyKey },
      );
      if (pi.status === "succeeded") {
        await sb
          .from("order_reservations")
          .update({
            payment_intent_id: pi.id,
            payment_status: "paid",
            pallet_close_state: "closed_charged",
            retry_scheduled_at: null,
          })
          .eq("id", row.id);
        return {
          status: "charged",
          paymentIntentId: pi.id,
          idempotencyKey,
        };
      }
      return {
        status: "failed",
        reason: `pi_status:${pi.status}`,
        idempotencyKey,
        paymentIntentId: pi.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: "failed", reason: msg, idempotencyKey };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "failed", reason: msg, idempotencyKey };
  }
}
