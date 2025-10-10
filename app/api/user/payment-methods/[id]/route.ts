import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";

/**
 * DELETE /api/user/payment-methods/[id]
 * 
 * Delete a payment method
 */
export async function DELETE(
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

    console.log("🗑️ Deleting payment method:", id, "for user:", user.id);

    // Detach payment method from customer
    await stripe.paymentMethods.detach(id);

    console.log("✅ Payment method deleted:", id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method", details: error.message },
      { status: 500 }
    );
  }
}
