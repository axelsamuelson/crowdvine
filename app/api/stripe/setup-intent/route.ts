import { NextResponse } from "next/server";
import { createSetupIntent } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/supabase-server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";

/**
 * Authenticated SetupIntent for saved cards.
 * Uses profiles.stripe_customer_id via getOrCreateStripeCustomer (legacy membership as fallback).
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getOrCreateStripeCustomer(user.id);
    const setupIntent = await createSetupIntent(customerId);

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    console.error("Setup intent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
