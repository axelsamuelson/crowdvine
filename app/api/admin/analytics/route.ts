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

      if (error) {
        console.error("Analytics funnel error:", error);
        // If view doesn't exist or error, try to get data directly from user_events
        const { data: eventsData, error: eventsError } = await sb
          .from("user_events")
          .select("user_id, event_type, created_at")
          .not("user_id", "is", null);
        
        if (eventsError) {
          console.error("Could not fetch from user_events:", eventsError);
          return NextResponse.json({ 
            error: "Analytics tables not found. Please run the migration.",
            details: error.message 
          }, { status: 404 });
        }

        // Calculate funnel from raw events
        const usersMap = new Map();
        eventsData.forEach((event: any) => {
          if (!usersMap.has(event.user_id)) {
            usersMap.set(event.user_id, {});
          }
          const user = usersMap.get(event.user_id);
          
          if (event.event_type === 'access_request_submitted' && !user.access_requested_at) {
            user.access_requested_at = event.created_at;
          } else if (event.event_type === 'access_approved' && !user.access_approved_at) {
            user.access_approved_at = event.created_at;
          } else if (event.event_type === 'user_first_login' && !user.first_login_at) {
            user.first_login_at = event.created_at;
          } else if (event.event_type === 'product_viewed' && !user.first_product_view_at) {
            user.first_product_view_at = event.created_at;
          } else if (event.event_type === 'add_to_cart' && !user.first_add_to_cart_at) {
            user.first_add_to_cart_at = event.created_at;
          } else if (event.event_type === 'cart_validation_passed' && !user.cart_validation_passed_at) {
            user.cart_validation_passed_at = event.created_at;
          } else if (event.event_type === 'checkout_started' && !user.checkout_started_at) {
            user.checkout_started_at = event.created_at;
          } else if (event.event_type === 'reservation_completed' && !user.reservation_completed_at) {
            user.reservation_completed_at = event.created_at;
          }
        });

        const funnelUsers = Array.from(usersMap.values());
        
        const metrics = {
          total_users: funnelUsers.length,
          access_requested: funnelUsers.filter(u => u.access_requested_at).length,
          access_approved: funnelUsers.filter(u => u.access_approved_at).length,
          first_login: funnelUsers.filter(u => u.first_login_at).length,
          first_product_view: funnelUsers.filter(u => u.first_product_view_at).length,
          first_add_to_cart: funnelUsers.filter(u => u.first_add_to_cart_at).length,
          cart_validation_passed: funnelUsers.filter(u => u.cart_validation_passed_at).length,
          checkout_started: funnelUsers.filter(u => u.checkout_started_at).length,
          reservation_completed: funnelUsers.filter(u => u.reservation_completed_at).length,
        };

        return NextResponse.json({ funnel: metrics, users: funnelUsers });
      }

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
        .select(`
          *,
          profiles(first_name, last_name, email)
        `)
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
