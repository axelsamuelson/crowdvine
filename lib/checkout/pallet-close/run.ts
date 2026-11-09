/**
 * Shared-pallet close-flow cron runner.
 * Behind isPalletCloseFlowEnabled() (default OFF). Never applies migrations.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeSharedPalletChargeDeadlineIso } from "@/lib/checkout/shared-pallet-deadline";
import { isPalletCloseFlowEnabled } from "@/lib/checkout/pallet-close/flags";
import { isSharedPalletFullForClose } from "@/lib/checkout/pallet-close/pallet-full";
import {
  applyPalletCloseTransition,
  buildPalletCloseChargeIdempotencyKey,
} from "@/lib/checkout/pallet-close/state-machine";
import { chargeReservationAtPalletClose } from "@/lib/checkout/pallet-close/charge";
import { cancelReservationAndDetachPaymentMethod } from "@/lib/checkout/pallet-close/cancel";
import { createPalletClosePaymentLink } from "@/lib/checkout/pallet-close/payment-link";
import { createPalletCloseActionToken } from "@/lib/checkout/pallet-close/tokens";
import {
  sendPalletCloseCancelledEmailOnce,
  sendPalletCloseChoiceEmailOnce,
  sendPalletClosePaymentFailedEmailOnce,
  sendPalletClosedChargedEmailOnce,
} from "@/lib/checkout/pallet-close/send";
import {
  CHOICE_REPLY_DAYS,
  PAY_LINK_DAYS,
  type PalletCloseReservationSnapshot,
} from "@/lib/checkout/pallet-close/types";
import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";
import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
import { stripe } from "@/lib/stripe";

export type PalletCloseRunSummary = {
  enabled: boolean;
  scanned: number;
  charged: number;
  choiceSent: number;
  choiceTimedOut: number;
  payLinkTimedOut: number;
  payLinkOpened: number;
  skipped: number;
  errors: number;
  actions: Array<Record<string, unknown>>;
};

function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function shouldSendEmail(): boolean {
  const forced = String(process.env.PALLET_CLOSE_SEND_EMAIL ?? "")
    .trim()
    .toLowerCase();
  if (forced === "false" || forced === "0" || forced === "off") return false;
  if (forced === "true" || forced === "1" || forced === "on") {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  }
  // Default: send only when Resend is configured (preview/prod). CI has no key.
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

const SNAPSHOT_SELECT =
  "id, pallet_id, payment_status, payment_method_id, setup_intent_id, payment_intent_id, status, cancelled_at, charge_deadline_at, pallet_close_state, pallet_close_choice, pallet_close_choice_sent_at, pallet_close_choice_reply_by, pallet_close_extension_count, offsession_charge_failed_at, offsession_pay_by, payment_method_detached_at, pallet_close_charge_idempotency_key, fulfillment_channel, payment_mode, user_id";

async function resolveAmountOre(reservationId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("order_reservations")
    .select("setup_intent_id")
    .eq("id", reservationId)
    .maybeSingle();
  if (row?.setup_intent_id && stripe) {
    try {
      const si = await stripe.setupIntents.retrieve(String(row.setup_intent_id));
      const ore = Number(
        (si.metadata as { expected_amount_ore?: string } | null)
          ?.expected_amount_ore,
      );
      if (Number.isFinite(ore) && ore > 0) return Math.round(ore);
    } catch {
      /* fall through */
    }
  }
  const { data: items } = await sb
    .from("order_reservation_items")
    .select("quantity, wines(base_price_cents)")
    .eq("reservation_id", reservationId);
  let ore = 0;
  for (const it of items || []) {
    const qty = Number(it.quantity) || 0;
    const wine = it.wines as
      | { base_price_cents?: number }
      | { base_price_cents?: number }[]
      | null;
    const unit = Array.isArray(wine)
      ? Number(wine[0]?.base_price_cents) || 0
      : Number(wine?.base_price_cents) || 0;
    ore += qty * unit;
  }
  return Math.round(ore);
}

async function resolveDeadlineIso(
  row: PalletCloseReservationSnapshot & {
    pallet_id: string | null;
  },
): Promise<string | null> {
  if (row.charge_deadline_at) return row.charge_deadline_at;
  if (!row.pallet_id) return null;
  const sb = getSupabaseAdmin();
  const { data: pallet } = await sb
    .from("pallets")
    .select("created_at")
    .eq("id", row.pallet_id)
    .maybeSingle();
  return computeSharedPalletChargeDeadlineIso(pallet?.created_at ?? null);
}

async function processChargePath(opts: {
  row: PalletCloseReservationSnapshot;
  now: Date;
  summary: PalletCloseRunSummary;
}): Promise<void> {
  const { row, now, summary } = opts;
  if (!row.pallet_id) {
    summary.skipped += 1;
    return;
  }

  const chargeResult = await chargeReservationAtPalletClose({
    reservation: row,
    palletId: row.pallet_id,
  });

  if (chargeResult.status === "charged" || chargeResult.status === "already_paid") {
    const transition = applyPalletCloseTransition(
      { ...row, pallet_close_state: "charging" },
      {
        type: "charge_succeeded",
        nowIso: now.toISOString(),
        idempotencyKey: chargeResult.idempotencyKey,
      },
    );
    if (transition.ok) {
      const sb = getSupabaseAdmin();
      await sb
        .from("order_reservations")
        .update(transition.next)
        .eq("id", row.id);
    }
    if (shouldSendEmail()) {
      await sendPalletClosedChargedEmailOnce({ reservationId: row.id });
    }
    summary.charged += 1;
    summary.actions.push({
      reservationId: row.id,
      action: "charged",
      status: chargeResult.status,
    });
    await getSupabaseAdmin().from("pallet_close_events").insert({
      reservation_id: row.id,
      pallet_id: row.pallet_id,
      event: "charged",
      meta: { status: chargeResult.status },
    });
    return;
  }

  if (chargeResult.status === "skipped") {
    summary.skipped += 1;
    summary.actions.push({
      reservationId: row.id,
      action: "charge_skipped",
      reason: chargeResult.reason,
    });
    return;
  }

  // failed → payment link window
  const payByIso = addDaysIso(now, PAY_LINK_DAYS);
  const amountOre = await resolveAmountOre(row.id);
  let paymentLinkUrl: string | null = null;
  const link = await createPalletClosePaymentLink({
    reservationId: row.id,
    amountOre,
    palletId: row.pallet_id,
  });
  if (link.ok) paymentLinkUrl = link.url;

  const transition = applyPalletCloseTransition(
    { ...row, pallet_close_state: "charging" },
    {
      type: "charge_failed",
      nowIso: now.toISOString(),
      payByIso,
      paymentLinkUrl,
    },
  );
  if (transition.ok) {
    await getSupabaseAdmin()
      .from("order_reservations")
      .update(transition.next)
      .eq("id", row.id);
  }

  if (shouldSendEmail() && paymentLinkUrl) {
    await sendPalletClosePaymentFailedEmailOnce({
      reservationId: row.id,
      payByIso,
      paymentLinkUrl,
    });
  }

  summary.payLinkOpened += 1;
  summary.actions.push({
    reservationId: row.id,
    action: "charge_failed_pay_link",
    reason: chargeResult.reason,
  });
  await getSupabaseAdmin().from("pallet_close_events").insert({
    reservation_id: row.id,
    pallet_id: row.pallet_id,
    event: "charge_failed",
    meta: { reason: chargeResult.reason, has_link: Boolean(paymentLinkUrl) },
  });
}

async function processDeadlineRow(opts: {
  row: PalletCloseReservationSnapshot;
  now: Date;
  summary: PalletCloseRunSummary;
}): Promise<void> {
  const { row, now, summary } = opts;
  if (!row.pallet_id) {
    summary.skipped += 1;
    return;
  }

  const fullness = await isSharedPalletFullForClose(row.pallet_id);
  if (fullness.full) {
    const transition = applyPalletCloseTransition(row, {
      type: "deadline_reached_full",
      nowIso: now.toISOString(),
    });
    if (!transition.ok) {
      summary.skipped += 1;
      return;
    }
    await getSupabaseAdmin()
      .from("order_reservations")
      .update(transition.next)
      .eq("id", row.id);
    await processChargePath({
      row: { ...row, ...transition.next },
      now,
      summary,
    });
    return;
  }

  const replyByIso = addDaysIso(now, CHOICE_REPLY_DAYS);
  const transition = applyPalletCloseTransition(row, {
    type: "deadline_reached_not_full",
    nowIso: now.toISOString(),
    replyByIso,
  });
  if (!transition.ok) {
    summary.skipped += 1;
    return;
  }

  const sb = getSupabaseAdmin();
  await sb.from("order_reservations").update(transition.next).eq("id", row.id);

  const expiresAt = new Date(replyByIso);
  const waitTok = await createPalletCloseActionToken({
    reservationId: row.id,
    action: "wait",
    expiresAt,
  });
  const cancelTok = await createPalletCloseActionToken({
    reservationId: row.id,
    action: "cancel",
    expiresAt,
  });
  let switchDirectUrl: string | null = null;
  if (isDirectBoxCheckoutEnabled()) {
    const switchTok = await createPalletCloseActionToken({
      reservationId: row.id,
      action: "switch_direct",
      expiresAt,
    });
    switchDirectUrl = switchTok.url;
  }

  if (shouldSendEmail()) {
    await sendPalletCloseChoiceEmailOnce({
      reservationId: row.id,
      replyByIso,
      waitUrl: waitTok.url,
      cancelUrl: cancelTok.url,
      switchDirectUrl,
    });
  }

  summary.choiceSent += 1;
  summary.actions.push({
    reservationId: row.id,
    action: "choice_sent",
    replyByIso,
  });
  await sb.from("pallet_close_events").insert({
    reservation_id: row.id,
    pallet_id: row.pallet_id,
    event: "choice_sent",
    meta: { reply_by: replyByIso, direct_offered: Boolean(switchDirectUrl) },
  });
}

async function processChoiceTimeout(opts: {
  row: PalletCloseReservationSnapshot;
  now: Date;
  summary: PalletCloseRunSummary;
}): Promise<void> {
  const { row, now, summary } = opts;
  const transition = applyPalletCloseTransition(row, {
    type: "choice_timeout",
    nowIso: now.toISOString(),
  });
  if (!transition.ok) {
    summary.skipped += 1;
    return;
  }

  const result = await cancelReservationAndDetachPaymentMethod({
    reservationId: row.id,
    reason: "choice_timeout",
    now,
  });
  if (!result.ok) {
    summary.errors += 1;
    return;
  }
  if (shouldSendEmail()) {
    await sendPalletCloseCancelledEmailOnce({
      reservationId: row.id,
      reason: "choice_timeout",
    });
  }
  summary.choiceTimedOut += 1;
  summary.actions.push({
    reservationId: row.id,
    action: "choice_timeout_cancel",
  });
}

async function processPayLinkTimeout(opts: {
  row: PalletCloseReservationSnapshot;
  now: Date;
  summary: PalletCloseRunSummary;
}): Promise<void> {
  const { row, now, summary } = opts;
  // Re-check Stripe / DB payment status before cancelling
  const sb = getSupabaseAdmin();
  const { data: fresh } = await sb
    .from("order_reservations")
    .select("payment_status")
    .eq("id", row.id)
    .maybeSingle();
  if (String(fresh?.payment_status) === "paid") {
    const transition = applyPalletCloseTransition(row, {
      type: "pay_link_paid",
      nowIso: now.toISOString(),
    });
    if (transition.ok) {
      await sb.from("order_reservations").update(transition.next).eq("id", row.id);
      if (shouldSendEmail()) {
        await sendPalletClosedChargedEmailOnce({ reservationId: row.id });
      }
      summary.charged += 1;
    }
    return;
  }

  const transition = applyPalletCloseTransition(row, {
    type: "pay_link_timeout",
    nowIso: now.toISOString(),
  });
  if (!transition.ok) {
    summary.skipped += 1;
    return;
  }

  const result = await cancelReservationAndDetachPaymentMethod({
    reservationId: row.id,
    reason: "pay_link_timeout",
    now,
  });
  if (!result.ok) {
    summary.errors += 1;
    return;
  }
  if (shouldSendEmail()) {
    await sendPalletCloseCancelledEmailOnce({
      reservationId: row.id,
      reason: "pay_link_timeout",
    });
  }
  summary.payLinkTimedOut += 1;
  summary.actions.push({
    reservationId: row.id,
    action: "pay_link_timeout_cancel",
  });
}

/**
 * Also charge open/extended reservations whose pallet is already full
 * (before deadline) — "whichever first".
 */
async function processEarlyFullCharge(opts: {
  row: PalletCloseReservationSnapshot;
  now: Date;
  summary: PalletCloseRunSummary;
}): Promise<void> {
  const { row, now, summary } = opts;
  if (!row.pallet_id) return;
  const fullness = await isSharedPalletFullForClose(row.pallet_id);
  if (!fullness.full) return;

  const transition = applyPalletCloseTransition(row, {
    type: "deadline_reached_full",
    nowIso: now.toISOString(),
  });
  if (!transition.ok) return;

  await getSupabaseAdmin()
    .from("order_reservations")
    .update(transition.next)
    .eq("id", row.id);

  await processChargePath({
    row: { ...row, ...transition.next },
    now,
    summary,
  });
}

export async function runPalletCloseJob(
  now: Date = new Date(),
): Promise<PalletCloseRunSummary> {
  const summary: PalletCloseRunSummary = {
    enabled: isPalletCloseFlowEnabled(),
    scanned: 0,
    charged: 0,
    choiceSent: 0,
    choiceTimedOut: 0,
    payLinkTimedOut: 0,
    payLinkOpened: 0,
    skipped: 0,
    errors: 0,
    actions: [],
  };

  if (!summary.enabled) {
    return summary;
  }

  const sb = getSupabaseAdmin();
  const nowIso = now.toISOString();

  // 1) Choice timeouts
  {
    const { data: rows, error } = await sb
      .from("order_reservations")
      .select(SNAPSHOT_SELECT)
      .eq("pallet_close_state", "choice_pending")
      .is("cancelled_at", null)
      .neq("payment_status", "paid")
      .lte("pallet_close_choice_reply_by", nowIso)
      .limit(100);

    if (error) {
      console.error("[pallet-close] choice timeout scan", error.message);
      summary.errors += 1;
    } else {
      for (const raw of rows || []) {
        summary.scanned += 1;
        try {
          await processChoiceTimeout({
            row: raw as PalletCloseReservationSnapshot,
            now,
            summary,
          });
        } catch (e) {
          summary.errors += 1;
          console.error("[pallet-close] choice timeout", e);
        }
      }
    }
  }

  // 2) Pay-link timeouts
  {
    const { data: rows, error } = await sb
      .from("order_reservations")
      .select(SNAPSHOT_SELECT)
      .eq("pallet_close_state", "pay_link_pending")
      .is("cancelled_at", null)
      .neq("payment_status", "paid")
      .lte("offsession_pay_by", nowIso)
      .limit(100);

    if (error) {
      console.error("[pallet-close] pay-link timeout scan", error.message);
      summary.errors += 1;
    } else {
      for (const raw of rows || []) {
        summary.scanned += 1;
        try {
          await processPayLinkTimeout({
            row: raw as PalletCloseReservationSnapshot,
            now,
            summary,
          });
        } catch (e) {
          summary.errors += 1;
          console.error("[pallet-close] pay-link timeout", e);
        }
      }
    }
  }

  // 3) Open / extended: deadline passed OR pallet already full
  {
    const { data: rows, error } = await sb
      .from("order_reservations")
      .select(SNAPSHOT_SELECT)
      .is("cancelled_at", null)
      .eq("payment_status", "pending")
      .eq("payment_mode", "setup_intent")
      .or(
        "pallet_close_state.is.null,pallet_close_state.eq.open,pallet_close_state.eq.extended",
      )
      .not("pallet_id", "is", null)
      .limit(200);

    if (error) {
      console.error("[pallet-close] open scan", error.message);
      summary.errors += 1;
    } else {
      for (const raw of rows || []) {
        const row = raw as PalletCloseReservationSnapshot & {
          fulfillment_channel?: string | null;
        };
        if (
          !isPalletBasedReservation({
            pallet_id: row.pallet_id,
            fulfillment_channel: row.fulfillment_channel,
          })
        ) {
          continue;
        }

        summary.scanned += 1;
        try {
          const deadline = await resolveDeadlineIso(row);
          if (deadline && !row.charge_deadline_at) {
            await sb
              .from("order_reservations")
              .update({ charge_deadline_at: deadline })
              .eq("id", row.id)
              .is("charge_deadline_at", null);
            row.charge_deadline_at = deadline;
          }

          const deadlinePassed =
            deadline != null && Date.parse(deadline) <= now.getTime();

          if (deadlinePassed) {
            await processDeadlineRow({ row, now, summary });
          } else {
            await processEarlyFullCharge({ row, now, summary });
          }
        } catch (e) {
          summary.errors += 1;
          console.error("[pallet-close] open row", row.id, e);
        }
      }
    }
  }

  return summary;
}

export { buildPalletCloseChargeIdempotencyKey };
