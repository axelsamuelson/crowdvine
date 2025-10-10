import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";

/**
 * PATCH /api/user/payment-methods/[id]/set-default
 * 
 * Set a payment method as default
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if Stripe is configured
    if (!STRIPE_CONFIG.isConfigured || !stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 }
      );
    }

    console.log("⭐ Setting default payment method:", id, "for user:", user.id);

    // Find Stripe customer for this user
    const customers = await stripe.customers.list({ limit: 100 });
    const customer = customers.data.find(c => c.metadata?.user_id === user.id);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Update customer's default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: id,
      },
    });

    console.log("✅ Default payment method set:", id, "for customer:", customer.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error setting default payment method:", error);
    return NextResponse.json(
      { error: "Failed to set default payment method", details: error.message },
      { status: 500 }
    );
  }
}
