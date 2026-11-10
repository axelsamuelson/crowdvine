import { NextResponse } from "next/server";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";
import { stripe } from "@/lib/stripe";

/**
 * Preview-only SetupIntent for /dev/dual-offer-card-step screenshots.
 * Never available in production. Does not create a reservation.
 */
export async function POST() {
  if (!isDualOfferCheckoutSurfaceAllowed()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!stripe) {
    return NextResponse.json(
      { error: "stripe_unavailable" },
      { status: 503 },
    );
  }

  try {
    const si = await stripe.setupIntents.create({
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        purpose: "dev_dual_offer_card_step_review",
        synthetic: "true",
      },
    });
    if (!si.client_secret) {
      return NextResponse.json(
        { error: "missing_client_secret" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      clientSecret: si.client_secret,
      intentId: si.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "setup_intent_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
