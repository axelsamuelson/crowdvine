import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getMemberDiscountPercentForUserId } from "@/lib/membership/server-member-discount";
import { resolvePalletEarlyBirdContext } from "@/lib/pallet-early-bird-context";
import { applyPalletDiscount } from "@/lib/pallet-discount";
import { memberDiscountedTotalInclVat } from "@/lib/price-breakdown";
import { calculateCartShippingCost } from "@/lib/shipping-calculations";
import { allocatePactRedemptionPoints } from "@/lib/membership/pact-points-redemption-math";

type WineProducer = {
  boost_active?: boolean | null;
};

type WineJoin = {
  base_price_cents: number | null;
  producer_id: string | null;
  producers: WineProducer | WineProducer[] | null;
};

type ReservationItemRow = {
  quantity: number | null;
  item_id: string | null;
  /** Supabase may return a single object or a one-element array for embedded rows. */
  wines: WineJoin | WineJoin[] | null;
};

function singleWineFromRow(row: ReservationItemRow): WineJoin | null {
  const w = row.wines;
  if (!w) return null;
  return Array.isArray(w) ? w[0] ?? null : w;
}

type ReservationChargeRow = {
  id: string;
  user_id: string;
  payment_mode: string | null;
  payment_status: string | null;
  payment_method_id: string | null;
  setup_intent_id: string | null;
  payment_attempts: number | null;
};

function producerFromWine(wine: WineJoin | null): WineProducer | null {
  if (!wine?.producers) return null;
  return Array.isArray(wine.producers) ? wine.producers[0] ?? null : wine.producers;
}

function stripeFailureMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

async function sumPendingRedemptionPointsForReservation(
  reservationId: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from("pact_points_events")
    .select("points_delta")
    .eq("related_order_id", reservationId)
    .eq("event_type", "redemption")
    .eq("pending_until_payment", true);

  if (error || !rows?.length) return 0;

  let pts = 0;
  for (const r of rows) {
    const d = Number(r.points_delta);
    if (Number.isFinite(d) && d < 0) pts += Math.abs(Math.floor(d));
  }
  return pts;
}

/**
 * Prefer checkout-validated amount from SetupIntent metadata; otherwise recompute
 * from DB (member + early-bird + shipping − PACT pending redemption).
 */
async function resolveReservationChargeAmountInOre(params: {
  reservationId: string;
  userId: string;
  palletId: string;
  setupIntentId: string | null;
}): Promise<{ amountOre: number; source: "setup_intent_metadata" | "db_recomputed" }> {
  const { reservationId, userId, palletId, setupIntentId } = params;

  if (stripe && setupIntentId) {
    try {
      const si = await stripe.setupIntents.retrieve(setupIntentId);
      const raw =
        si.metadata && typeof si.metadata.expected_amount_ore === "string"
          ? Number(si.metadata.expected_amount_ore)
          : NaN;
      if (Number.isFinite(raw) && raw > 0) {
        return { amountOre: Math.round(raw), source: "setup_intent_metadata" };
      }
      console.warn(
        `[auto-charge] reservation_id=${reservationId} SetupIntent ${setupIntentId} missing expected_amount_ore; recomputing from DB`,
      );
    } catch (e) {
      console.warn(
        `[auto-charge] reservation_id=${reservationId} failed to retrieve SetupIntent; recomputing from DB`,
        e,
      );
    }
  }

  const sb = getSupabaseAdmin();

  const { data: items, error: itemsError } = await sb
    .from("order_reservation_items")
    .select(
      `
      quantity,
      item_id,
      wines (
        base_price_cents,
        producer_id,
        producers ( boost_active )
      )
    `,
    )
    .eq("reservation_id", reservationId);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const rows: ReservationItemRow[] = (items ?? []) as unknown as ReservationItemRow[];

  const uniqueWineIds = [
    ...new Set(
      rows
        .map((r) => (typeof r.item_id === "string" ? r.item_id : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const memberDiscountPercent = await getMemberDiscountPercentForUserId(userId);
  const earlyBird = await resolvePalletEarlyBirdContext(uniqueWineIds, userId);
  const palletTier = earlyBird.discountTier;

  let subtotalSek = 0;
  let boostedLineTotal = 0;
  let nonBoostedLineTotal = 0;

  for (const row of rows) {
    const wine = singleWineFromRow(row);
    if (!wine) continue;
    const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
    if (qty <= 0) continue;

    const baseCents = Number(wine.base_price_cents) || 0;
    const unitListSek = Math.ceil(baseCents / 100);
    const unitMemberSek = memberDiscountedTotalInclVat(
      unitListSek,
      memberDiscountPercent,
    );
    const lineTotalMember = unitMemberSek * qty;
    const lineTotalSek =
      palletTier > 0
        ? applyPalletDiscount(lineTotalMember, palletTier)
        : lineTotalMember;

    subtotalSek += lineTotalSek;

    const producer = producerFromWine(wine);
    const boosted = producer?.boost_active === true;
    if (boosted) boostedLineTotal += lineTotalSek;
    else nonBoostedLineTotal += lineTotalSek;
  }

  const { data: palletRow, error: palletErr } = await sb
    .from("pallets")
    .select("id, name, cost_cents, bottle_capacity")
    .eq("id", palletId)
    .maybeSingle();

  if (palletErr) throw new Error(palletErr.message);

  let shippingSek = 0;
  if (palletRow) {
    const shipping = calculateCartShippingCost(
      rows.map((r) => ({ quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)) })),
      {
        id: String(palletRow.id),
        name: String(palletRow.name ?? ""),
        costCents: Number(palletRow.cost_cents) || 0,
        bottleCapacity: Number(palletRow.bottle_capacity) || 0,
        currentBottles: 0,
        remainingBottles: 0,
      },
    );
    shippingSek = shipping?.totalShippingCostSek ?? 0;
  }

  const pendingPoints = await sumPendingRedemptionPointsForReservation(reservationId);
  const pactAlloc = allocatePactRedemptionPoints(
    pendingPoints,
    boostedLineTotal,
    nonBoostedLineTotal,
  );
  const pactSekOff = pactAlloc.sekDiscount;

  const finalSek = Math.max(0, subtotalSek + shippingSek - pactSekOff);
  const amountOre = Math.round(finalSek * 100);

  return { amountOre, source: "db_recomputed" };
}

async function markReservationPaymentFailed(
  reservationId: string,
  reason: string,
  priorAttempts: number | null,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const nextAttempts = (priorAttempts ?? 0) + 1;
  const { error } = await sb
    .from("order_reservations")
    .update({
      payment_status: "failed",
      payment_failed_reason: reason.slice(0, 2000),
      payment_attempts: nextAttempts,
      payment_last_attempt_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (error) {
    console.error(
      `[auto-charge] reservation_id=${reservationId} failed to persist payment failure:`,
      error,
    );
  }
}

type ChargeOneOutcome = "charged" | "failed" | "skipped";

async function chargeOneSetupIntentReservation(
  palletId: string,
  row: ReservationChargeRow,
): Promise<ChargeOneOutcome> {
  const sb = getSupabaseAdmin();
  const reservationId = row.id;

  if (!stripe) {
    console.error(
      `[auto-charge] reservation_id=${reservationId} Stripe not configured; skipping`,
    );
    return "skipped";
  }

  if (!row.payment_method_id) {
    console.warn(
      `[auto-charge] reservation_id=${reservationId} missing payment_method_id; skipping`,
    );
    return "skipped";
  }

  const { data: membership, error: memErr } = await sb
    .from("user_memberships")
    .select("stripe_customer_id")
    .eq("user_id", row.user_id)
    .maybeSingle();

  if (memErr || !membership?.stripe_customer_id?.trim()) {
    console.error(
      `[auto-charge] reservation_id=${reservationId} missing stripe_customer_id on user_memberships`,
      memErr,
    );
    await markReservationPaymentFailed(
      reservationId,
      "Missing Stripe customer on membership",
      row.payment_attempts,
    );
    return "failed";
  }

  const stripeCustomerId = membership.stripe_customer_id.trim();

  let reservationAmountInOre: number;
  try {
    const resolved = await resolveReservationChargeAmountInOre({
      reservationId: row.id,
      userId: row.user_id,
      palletId,
      setupIntentId: row.setup_intent_id,
    });
    reservationAmountInOre = resolved.amountOre;
    console.log(
      `[auto-charge] reservation_id=${reservationId} amount_ore=${reservationAmountInOre} source=${resolved.source}`,
    );
  } catch (e) {
    console.error(
      `[auto-charge] reservation_id=${reservationId} amount resolution failed:`,
      e,
    );
    await markReservationPaymentFailed(
      reservationId,
      stripeFailureMessage(e),
      row.payment_attempts,
    );
    return "failed";
  }

  if (reservationAmountInOre <= 0) {
    console.error(
      `[auto-charge] reservation_id=${reservationId} non-positive amount_ore=${reservationAmountInOre}`,
    );
    await markReservationPaymentFailed(
      reservationId,
      "Computed charge amount is zero or negative",
      row.payment_attempts,
    );
    return "failed";
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: reservationAmountInOre,
      currency: "sek",
      customer: stripeCustomerId,
      payment_method: row.payment_method_id,
      off_session: true,
      confirm: true,
      metadata: {
        reservation_id: row.id,
        user_id: row.user_id,
        pallet_id: palletId,
      },
    });

    if (paymentIntent.status === "succeeded") {
      const { error: upErr } = await sb
        .from("order_reservations")
        .update({
          payment_intent_id: paymentIntent.id,
          payment_status: "paid",
        })
        .eq("id", row.id);

      if (upErr) {
        console.error(
          `[auto-charge] reservation_id=${reservationId} succeeded at Stripe but DB update failed:`,
          upErr,
        );
        return "failed";
      }
      console.log(
        `[auto-charge] reservation_id=${reservationId} PI ${paymentIntent.id} succeeded (optimistic paid row; webhook will confirm)`,
      );
      return "charged";
    }
    const msg = `PaymentIntent status ${paymentIntent.status}`;
    console.warn(`[auto-charge] reservation_id=${reservationId} ${msg}`);
    await markReservationPaymentFailed(
      reservationId,
      msg,
      row.payment_attempts,
    );
    return "failed";
  } catch (err) {
    console.error(
      `[auto-charge] reservation_id=${reservationId} Stripe PaymentIntent.create failed:`,
      err,
    );
    await markReservationPaymentFailed(
      reservationId,
      stripeFailureMessage(err),
      row.payment_attempts,
    );
    return "failed";
  }
}

export type AutoChargePalletResult = {
  reservationsCharged: number;
  reservationsFailed: number;
};

/**
 * When a pallet fills or shipping is ordered: charge each deferred (setup_intent + pending + PM)
 * reservation independently. Verifies payment_intent rows are already paid.
 */
export async function autoChargeDeferredReservationsForPallet(
  palletId: string,
): Promise<AutoChargePalletResult> {
  const sb = getSupabaseAdmin();

  const { data: verifyRows, error: verifyErr } = await sb
    .from("order_reservations")
    .select("id, payment_status, payment_mode")
    .eq("pallet_id", palletId)
    .eq("payment_mode", "payment_intent");

  if (verifyErr) {
    console.error(
      `[auto-charge] pallet_id=${palletId} failed to load payment_intent reservations:`,
      verifyErr,
    );
  } else {
    for (const r of verifyRows ?? []) {
      if (String(r.payment_status) !== "paid") {
        console.warn(
          `[auto-charge] reservation_id=${r.id} payment_mode=payment_intent but payment_status=${String(r.payment_status)} (expected paid); not re-charging`,
        );
      }
    }
  }

  const { data: toCharge, error } = await sb
    .from("order_reservations")
    .select(
      "id, user_id, payment_mode, payment_status, payment_method_id, setup_intent_id, payment_attempts",
    )
    .eq("pallet_id", palletId)
    .eq("payment_mode", "setup_intent")
    .eq("payment_status", "pending")
    .not("payment_method_id", "is", null);

  if (error) {
    console.error(
      `[auto-charge] pallet_id=${palletId} failed to list setup_intent reservations:`,
      error,
    );
    return { reservationsCharged: 0, reservationsFailed: 0 };
  }

  const list = (toCharge ?? []) as ReservationChargeRow[];
  let reservationsCharged = 0;
  let reservationsFailed = 0;

  for (const row of list) {
    try {
      const outcome = await chargeOneSetupIntentReservation(palletId, row);
      if (outcome === "charged") reservationsCharged += 1;
      else if (outcome === "failed" || outcome === "skipped") {
        reservationsFailed += 1;
      }
    } catch (e) {
      console.error(
        `[auto-charge] reservation_id=${row.id} unexpected error in charge loop:`,
        e,
      );
      reservationsFailed += 1;
    }
  }

  return { reservationsCharged, reservationsFailed };
}
