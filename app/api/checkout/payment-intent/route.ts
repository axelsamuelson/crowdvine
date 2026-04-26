import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { CartService } from "@/src/lib/cart-service";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-completion";
import {
  allocatePactRedemptionPoints,
  calculateBoostAwareMaxRedemption,
} from "@/lib/membership/pact-points-redemption-math";
import { getRedeemableBalance } from "@/lib/membership/pact-points-engine";

type PaymentMode = "setup_intent" | "payment_intent";

/**
 * Contract: `cart_total_sek` must represent the server-calculable order total BEFORE PACT Points:
 *
 *   Subtotal (early-bird + member discounts already applied)
 * + Shipping
 * - Voucher discount (if active)
 * = cart_total_sek
 *
 * PACT Points are NOT subtracted at this point. This endpoint subtracts them based on `pact_points_redeem`.
 *
 * The server will re-calculate and validate the final amount during /api/checkout/confirm.
 */
type RequestBody = {
  pallet_id: string;
  cart_total_sek: number;
  pact_points_redeem?: number;
};

export async function POST(request: Request) {
  const PALLET_THRESHOLD = 300;

  try {
    console.log("=== CHECKOUT PAYMENT INTENT START ===");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      console.error("[payment-intent] Stripe not configured");
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    const bodyUnknown: unknown = await request.json().catch(() => null);
    const body = bodyUnknown as Partial<RequestBody> | null;

    const pallet_id = typeof body?.pallet_id === "string" ? body.pallet_id : "";
    const cart_total_sek =
      typeof body?.cart_total_sek === "number" ? body.cart_total_sek : NaN;
    const pact_points_redeem =
      typeof body?.pact_points_redeem === "number" ? body.pact_points_redeem : 0;

    if (!pallet_id) {
      return NextResponse.json({ error: "Missing pallet_id" }, { status: 400 });
    }

    if (!Number.isFinite(cart_total_sek) || cart_total_sek <= 0) {
      return NextResponse.json(
        { error: "cart_total_sek must be > 0" },
        { status: 400 },
      );
    }

    const sbAdmin = getSupabaseAdmin();

    const { data: palletRow, error: palletErr } = await sbAdmin
      .from("pallets")
      .select("bottle_capacity, status")
      .eq("id", pallet_id)
      .maybeSingle();

    if (palletErr) {
      console.error("[payment-intent] Failed to load pallet:", palletErr);
      return NextResponse.json(
        { error: "Failed to resolve pallet" },
        { status: 500 },
      );
    }
    if (!palletRow) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    const bottlesFilled = await sumReservedBottlesOnPallet(pallet_id);
    const paymentMode: PaymentMode =
      bottlesFilled >= PALLET_THRESHOLD ? "payment_intent" : "setup_intent";

    console.log("[payment-intent] Mode decision:", {
      pallet_id,
      bottlesFilled,
      palletThreshold: PALLET_THRESHOLD,
      paymentMode,
      palletStatus: palletRow.status,
      palletCapacity: palletRow.bottle_capacity,
    });

    // Compute boost-aware max redemption using current cart lines.
    const cart = await CartService.getCart();
    if (!cart || !cart.lines?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let boostedLineTotal = 0;
    let nonBoostedLineTotal = 0;
    for (const line of cart.lines) {
      const amt = parseFloat(String(line.cost.totalAmount.amount)) || 0;
      if (line.merchandise.product.producerBoostActive === true) {
        boostedLineTotal += amt;
      } else {
        nonBoostedLineTotal += amt;
      }
    }

    const availablePoints = await getRedeemableBalance(user.id);
    const { maxPoints } = calculateBoostAwareMaxRedemption(
      boostedLineTotal,
      nonBoostedLineTotal,
      availablePoints,
    );

    const requested = Math.max(0, Math.floor(pact_points_redeem));
    const pointsToRedeem = Math.min(requested, maxPoints);

    const alloc = allocatePactRedemptionPoints(
      pointsToRedeem,
      boostedLineTotal,
      nonBoostedLineTotal,
    );

    const finalAmountSek = Math.max(0, cart_total_sek - alloc.sekDiscount);
    const amountInOre = Math.round(finalAmountSek * 100);

    if (amountInOre <= 0) {
      return NextResponse.json(
        { error: "Order total cannot be zero" },
        { status: 400 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(user.id);

    if (paymentMode === "setup_intent") {
      const intent = await stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        usage: "off_session",
        metadata: {
          user_id: user.id,
          pallet_id,
          pact_points_redeem: String(pointsToRedeem),
          expected_amount_ore: String(amountInOre),
        },
      });

      console.log("[payment-intent] Created SetupIntent:", intent.id);

      return NextResponse.json({
        paymentMode,
        clientSecret: intent.client_secret,
        intentId: intent.id,
        amountInOre,
        bottlesFilled,
        palletThreshold: PALLET_THRESHOLD,
      });
    }

    const intent = await stripe.paymentIntents.create({
      customer: customerId,
      amount: amountInOre,
      currency: "sek",
      automatic_payment_methods: { enabled: true },
      capture_method: "automatic",
      metadata: {
        user_id: user.id,
        pallet_id,
        pact_points_redeem: String(pointsToRedeem),
      },
    });

    console.log("[payment-intent] Created PaymentIntent:", intent.id);

    return NextResponse.json({
      paymentMode,
      clientSecret: intent.client_secret,
      intentId: intent.id,
      amountInOre,
      bottlesFilled,
      palletThreshold: PALLET_THRESHOLD,
    });
  } catch (error) {
    console.error("=== CHECKOUT PAYMENT INTENT ERROR ===");
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

