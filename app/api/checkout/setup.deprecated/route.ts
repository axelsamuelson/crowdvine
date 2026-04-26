/**
 * DEPRECATED: Replaced by Payment Element SetupIntent flow (Fas 2.2).
 * This route used Stripe Checkout in `mode: "setup"` for saving cards.
 * Kept temporarily for reference and will be removed in a later cleanup phase.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  console.warn(
    "[DEPRECATED] /api/checkout/setup called. This route will be removed; use Payment Element flow instead.",
  );

  try {
    console.log("DEBUG: Starting checkout setup...");
    console.log("DEBUG: Stripe configured:", STRIPE_CONFIG.isConfigured);
    console.log("DEBUG: Has secret key:", !!process.env.STRIPE_SECRET_KEY);
    console.log(
      "DEBUG: Has publishable key:",
      !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    );

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

    // CRITICAL SECURITY: Require authentication for checkout setup
    const supabase = createSupabaseServerClient();

    // Get current user with proper session validation
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("SECURITY ERROR: Unauthenticated checkout setup attempt");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // CRITICAL SECURITY: Log the actual user making the request
    console.log("🔒 SECURITY LOG: Checkout setup request from user:", {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      endpoint: "/api/checkout/setup",
    });

    const email = user.email;
    const name = user.user_metadata?.full_name || user.email;

    console.log("DEBUG: Authenticated user email:", email);
    console.log("DEBUG: Authenticated user name:", name);

    // Get returnUrl from query params (default to /profile)
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get("returnUrl") || "/profile";
    console.log("DEBUG: Return URL:", returnUrl);

    // CRITICAL SECURITY: Use user ID as unique identifier for Stripe customers
    let customer: unknown;
    try {
      console.log("🔍 SECURITY: Looking for Stripe customer with user ID:", user.id);

      // First, try to find customer by metadata (user ID)
      const customers = await stripe!.customers.list({
        limit: 100,
      });

      const found = customers.data.find((c) => c.metadata?.user_id === user.id);
      customer = found ?? null;

      if (!found) {
        console.log(
          "🔍 SECURITY: No existing customer found, creating new one for user ID:",
          user.id,
        );
        const created = await stripe!.customers.create({
          email,
          name: name || undefined,
          metadata: {
            user_id: user.id,
            email: user.email,
          },
        });
        customer = created;
        console.log(
          "✅ SECURITY: Created new Stripe customer:",
          created.id,
          "for user:",
          user.id,
        );
      } else {
        console.log(
          "✅ SECURITY: Found existing Stripe customer:",
          found.id,
          "for user:",
          user.id,
        );
      }
    } catch (error) {
      console.error("❌ SECURITY ERROR: Error handling customer:", error);
      return NextResponse.json({ error: "Failed to handle customer" }, { status: 500 });
    }

    const customerId =
      customer && typeof customer === "object" && "id" in customer
        ? String((customer as { id: unknown }).id)
        : null;
    if (!customerId) {
      return NextResponse.json({ error: "Customer not available" }, { status: 500 });
    }

    // Create Stripe Checkout session for setup
    console.log("DEBUG: Creating checkout session...");

    // Always use the production domain for redirects
    const baseUrl = "https://pactwines.com";

    const successUrl = `${baseUrl}${returnUrl}?payment_method_added=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}${returnUrl}?payment_method_canceled=true`;

    // Validate URLs
    try {
      new URL(successUrl);
      new URL(cancelUrl);
    } catch (urlError) {
      console.error("ERROR: Invalid URL:", urlError);
      return NextResponse.json({ error: "Invalid URL configuration" }, { status: 500 });
    }

    const session = await stripe!.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "setup",
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "auto",
      metadata: {
        type: "payment_method_setup",
        user_id: user.id,
        user_email: user.email,
      },
      payment_method_options: {
        card: {
          setup_future_usage: "off_session",
        },
      },
    });

    // Track checkout started event
    try {
      const sb = getSupabaseAdmin();
      await sb.from("user_events").insert({
        user_id: user.id,
        session_id: session.id,
        event_type: "checkout_started",
        event_category: "checkout",
        event_metadata: { sessionId: session.id, type: "payment_method_setup" },
      });
    } catch (trackingError) {
      console.error("Failed to track checkout event:", trackingError);
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("ERROR: Checkout setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

