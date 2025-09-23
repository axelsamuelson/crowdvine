import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Fetching payment methods for user:", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    // Get user profile to find Stripe customer ID
    // We already have the user from getCurrentUser(), no need to fetch profile again

    // For now, we'll create a customer if one doesn't exist
    // In a real implementation, you'd store the Stripe customer ID in the user profile
    let customer;
    try {
      console.log("🔍 Looking for Stripe customer with email:", user.email);

      // Try to find existing customer by email
      const customers = await stripe.customers.list({ email: user.email });
      customer = customers.data[0];

      if (!customer) {
        console.log(
          "🔍 No existing customer found, creating new one for:",
          user.email,
        );
        // Create new customer
        customer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        });
        console.log("✅ Created new Stripe customer:", customer.id);
      } else {
        console.log("✅ Found existing Stripe customer:", customer.id);
      }
    } catch (error) {
      console.error("❌ Error handling customer:", error);
      return NextResponse.json(
        { error: "Failed to handle customer" },
        { status: 500 },
      );
    }

    // Get payment methods for this customer
    console.log("🔍 Fetching payment methods for customer:", customer.id);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    });

    console.log("📋 Found payment methods:", paymentMethods.data.length);

    // Transform to our format
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: "card" as const,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      is_default: false, // We'll handle this separately
      expiry_month: pm.card?.exp_month,
      expiry_year: pm.card?.exp_year,
    }));

    console.log("✅ Returning payment methods for user:", user.email);
    return NextResponse.json(formattedMethods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 },
    );
  }
}
