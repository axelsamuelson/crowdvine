import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    // Get user profile to find Stripe customer ID
    const profileResponse = await fetch(`https://pactwines.com/api/user/profile`, {
      headers: {
        'Cookie': `sb-abrnvjqwpdkodgrtezeg-auth-token=${user.id}` // This is a simplified approach
      }
    });

    // For now, we'll create a customer if one doesn't exist
    // In a real implementation, you'd store the Stripe customer ID in the user profile
    let customer;
    try {
      // Try to find existing customer by email
      const customers = await stripe.customers.list({ email: user.email });
      customer = customers.data[0];
      
      if (!customer) {
        // Create new customer
        customer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        });
      }
    } catch (error) {
      console.error('Error handling customer:', error);
      return NextResponse.json({ error: "Failed to handle customer" }, { status: 500 });
    }

    // Get payment methods for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    // Transform to our format
    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: 'card' as const,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      is_default: false, // We'll handle this separately
      expiry_month: pm.card?.exp_month,
      expiry_year: pm.card?.exp_year,
    }));

    return NextResponse.json(formattedMethods);

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}