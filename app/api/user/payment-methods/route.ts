import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";

/**
 * GET /api/user/payment-methods
 *
 * Returns user's payment methods from Stripe
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Stripe is configured
    if (!STRIPE_CONFIG.isConfigured || !stripe) {
      console.log("⚠️ Stripe not configured, returning empty payment methods");
      return NextResponse.json({
        paymentMethods: [],
      });
    }

    // Find Stripe customer for this user
    const customers = await stripe.customers.list({ limit: 100 });
    const customer = customers.data.find(
      (c) => c.metadata?.user_id === user.id,
    );

    if (!customer) {
      console.log("ℹ️ No Stripe customer found for user:", user.id);
      return NextResponse.json({
        paymentMethods: [],
      });
    }

    console.log("✅ Found Stripe customer:", customer.id, "for user:", user.id);

    // Get payment methods for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    });

    console.log("💳 Payment methods found:", paymentMethods.data.length);

    // Transform Stripe payment methods to our format
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: "card" as const,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      is_default: customer.invoice_settings.default_payment_method === pm.id,
      expiry_month: pm.card?.exp_month,
      expiry_year: pm.card?.exp_year,
    }));

    return NextResponse.json({
      paymentMethods: formattedMethods,
    });
  } catch (error) {
    console.error("❌ Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 },
    );
  }
}
