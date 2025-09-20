import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const { id: paymentMethodId } = await params;

    // Get user profile to find Stripe customer ID
    const profileResponse = await fetch(`https://pactwines.com/api/user/profile`, {
      headers: {
        'Cookie': `sb-abrnvjqwpdkodgrtezeg-auth-token=${user.id}` // This is a simplified approach
      }
    });

    // For now, we'll create a customer if one doesn't exist
    let customer;
    try {
      const customers = await stripe.customers.list({ email: user.email });
      customer = customers.data[0];
      
      if (!customer) {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        });
      }
    } catch (error) {
      console.error('Error handling customer:', error);
      return NextResponse.json({ error: "Failed to handle customer" }, { status: 500 });
    }

    // Set this payment method as the default for the customer
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error setting default payment method:', error);
    return NextResponse.json({ error: "Failed to set default payment method" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const { id: paymentMethodId } = await params;

    // Detach the payment method from any customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json({ error: "Failed to delete payment method" }, { status: 500 });
  }
}
