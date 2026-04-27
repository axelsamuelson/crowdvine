import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStripeCustomerId } from "@/lib/stripe/customer";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";

/**
 * DELETE /api/user/payment-methods/[id]
 *
 * Delete a payment method
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!STRIPE_CONFIG.isConfigured || !stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    let customerId: string;
    try {
      const resolved = await getStripeCustomerId(user.id);
      if (!resolved) {
        return NextResponse.json(
          { error: "No payment method on file" },
          { status: 404 },
        );
      }
      customerId = resolved;
    } catch {
      return NextResponse.json(
        { error: "Failed to load billing profile" },
        { status: 500 },
      );
    }

    const pm = await stripe.paymentMethods.retrieve(id);
    const pmCustomer =
      typeof pm.customer === "string"
        ? pm.customer
        : pm.customer?.id ?? null;

    if (pmCustomer !== customerId) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 },
      );
    }

    await stripe.paymentMethods.detach(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("❌ Error deleting payment method:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete payment method";
    return NextResponse.json(
      { error: "Failed to delete payment method", details: message },
      { status: 500 },
    );
  }
}
