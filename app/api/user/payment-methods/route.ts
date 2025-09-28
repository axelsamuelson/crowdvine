import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get current user with proper session validation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to verify access
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, producer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log("🔍 SECURITY: Fetching payment methods for user:", {
      id: user.id,
      email: user.email,
      role: profile.role,
    });
    
    // CRITICAL SECURITY: Log the actual user making the request
    console.log("🔒 SECURITY LOG: Payment methods request from user:", {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      endpoint: "/api/user/payment-methods"
    });

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    // Get user profile to find Stripe customer ID
    // We already have the user from getCurrentUser(), no need to fetch profile again

    // CRITICAL SECURITY: Use user ID as unique identifier for Stripe customers
    // This prevents cross-user data contamination
    let customer;
    try {
      console.log("🔍 SECURITY: Looking for Stripe customer with user ID:", user.id);

      // First, try to find customer by metadata (user ID)
      const customers = await stripe.customers.list({ 
        limit: 100 // Get more customers to search through
      });
      
      // Find customer by user ID in metadata
      customer = customers.data.find(c => c.metadata?.user_id === user.id);

      if (!customer) {
        console.log(
          "🔍 SECURITY: No existing customer found, creating new one for user ID:",
          user.id,
        );
        // Create new customer with user ID in metadata
        customer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          metadata: {
            user_id: user.id, // CRITICAL: Use user ID as unique identifier
            email: user.email
          }
        });
        console.log("✅ SECURITY: Created new Stripe customer:", customer.id, "for user:", user.id);
      } else {
        console.log("✅ SECURITY: Found existing Stripe customer:", customer.id, "for user:", user.id);
      }
    } catch (error) {
      console.error("❌ SECURITY ERROR: Error handling customer:", error);
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
