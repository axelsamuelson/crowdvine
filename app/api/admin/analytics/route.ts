import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || "30d";
  const metric = searchParams.get("metric") || "funnel";

  const sb = getSupabaseAdmin();

  try {
    if (metric === "funnel") {
      // Get funnel data from view with user names
      const { data, error } = await sb
        .from("user_journey_funnel")
        .select(`
          user_id,
          access_requested_at,
          access_approved_at,
          first_login_at,
          first_product_view_at,
          first_add_to_cart_at,
          cart_validation_passed_at,
          checkout_started_at,
          reservation_completed_at,
          profiles(first_name, last_name)
        `);

      if (error) throw error;

      // Calculate funnel metrics
      const metrics = {
        total_users: data.length,
        access_requested: data.filter(u => u.access_requested_at).length,
        access_approved: data.filter(u => u.access_approved_at).length,
        first_login: data.filter(u => u.first_login_at).length,
        first_product_view: data.filter(u => u.first_product_view_at).length,
        first_add_to_cart: data.filter(u => u.first_add_to_cart_at).length,
        cart_validation_passed: data.filter(u => u.cart_validation_passed_at).length,
        checkout_started: data.filter(u => u.checkout_started_at).length,
        reservation_completed: data.filter(u => u.reservation_completed_at).length,
      };

      return NextResponse.json({ funnel: metrics, users: data });
    }

    if (metric === "events") {
      const { data, error } = await sb
        .from("user_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return NextResponse.json({ events: data });
    }

    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
