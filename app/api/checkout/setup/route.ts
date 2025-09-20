import { NextResponse } from "next/server";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";

export async function GET(request: Request) {
  try {
    console.log("DEBUG: Starting checkout setup...");
    console.log("DEBUG: Stripe configured:", STRIPE_CONFIG.isConfigured);
    console.log("DEBUG: Has secret key:", !!process.env.STRIPE_SECRET_KEY);
    console.log("DEBUG: Has publishable key:", !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    
    // Check if Stripe is configured
    if (!STRIPE_CONFIG.isConfigured) {
      console.error("ERROR: Stripe is not configured");
      return NextResponse.json(
        {
          error: "Stripe is not configured",
          message:
            "Please set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.",
          setupUrl: null,
        },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const name = searchParams.get("name");

    console.log("DEBUG: Email:", email);
    console.log("DEBUG: Name:", name);

    if (!email) {
      console.error("ERROR: Email is required");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Create or get customer
    let customer;
    try {
      console.log("DEBUG: Creating Stripe customer...");
      customer = await stripe!.customers.create({
        email,
        name: name || undefined,
      });
      console.log("DEBUG: Customer created:", customer.id);
    } catch (error: any) {
      console.error("ERROR: Creating customer failed:", error);
      // If customer already exists, try to retrieve it
      if (error.code === "resource_missing") {
        console.log("DEBUG: Customer not found, searching for existing...");
        const customers = await stripe!.customers.list({ email });
        customer = customers.data[0];
        console.log("DEBUG: Found existing customer:", customer?.id);
      } else {
        console.error("ERROR: Failed to create customer:", error);
        return NextResponse.json(
          { error: "Failed to create customer", details: error.message },
          { status: 500 },
        );
      }
    }

    // Create Stripe Checkout session for setup
    console.log("DEBUG: Creating checkout session...");
    const session = await stripe!.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      mode: "setup",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com"}/profile?payment_method_added=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com"}/profile?payment_method_canceled=true`,
      metadata: {
        type: "payment_method_setup",
      },
    });

    console.log("DEBUG: Session created:", session.id);
    console.log("DEBUG: Session URL:", session.url);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("ERROR: Checkout setup error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}
