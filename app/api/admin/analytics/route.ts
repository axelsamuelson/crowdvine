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
          profiles(full_name, email)
        `);

      console.log("DEBUG: Attempting to fetch from user_journey_funnel view");
      
      if (data) {
        console.log("DEBUG: Fetched from view, data length:", data.length);
        console.log("DEBUG: Sample data from view:", data[0]);
      }
      
      if (error) {
        console.error("Analytics funnel error:", error);
        console.log("DEBUG: Falling back to raw events method");
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
            usersMap.set(event.user_id, { user_id: event.user_id });
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
        console.log("DEBUG: Calculated funnel users:", funnelUsers.length);
        console.log("DEBUG: Sample user:", funnelUsers[0]);
        
        // Get profiles for users
        const userIds = [...new Set(funnelUsers.map(u => u.user_id))];
        console.log("DEBUG: Fetching profiles for user IDs:", userIds);
        let profilesMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
          try {
            const { data: profiles, error: profilesError } = await sb
              .from("profiles")
              .select("id, full_name, email")
              .in("id", userIds);
            
            if (!profilesError && profiles) {
              profilesMap = profiles.reduce((acc, profile) => {
                acc[profile.id] = profile;
                return acc;
              }, {} as Record<string, any>);
              console.log("DEBUG: Fetched profiles:", profiles.length);
              console.log("DEBUG: Sample profile:", profiles[0]);
            } else {
              console.log("DEBUG: Failed to fetch profiles:", profilesError);
            }
          } catch (profilesError) {
            console.error("Error fetching profiles:", profilesError);
          }
        }

        // Attach profile data to users
        const usersWithProfiles = funnelUsers.map(user => ({
          ...user,
          profiles: profilesMap[user.user_id]
        }));
        
        console.log("DEBUG: After attaching profiles, sample user:", usersWithProfiles[0]);
        console.log("DEBUG: First user's profile:", usersWithProfiles[0]?.profiles);
        
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

        return NextResponse.json({ funnel: metrics, users: usersWithProfiles });
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

      console.log("DEBUG: Calculated metrics from view");
      console.log("DEBUG: User IDs from view:", data.map(u => u.user_id));

      // Get profiles separately to ensure we have the data
      const userIds = [...new Set(data.map(u => u.user_id))];
      console.log("DEBUG: Fetching profiles for user IDs:", userIds);
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await sb
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          
          if (!profilesError && profiles) {
            profilesMap = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, any>);
            console.log("DEBUG: Fetched profiles from database:", profiles.length);
            console.log("DEBUG: Sample profile:", profiles[0]);
          } else {
            console.log("DEBUG: Failed to fetch profiles:", profilesError);
          }
        } catch (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        }
      }

      // Attach profile data to users (use profiles from map if view didn't return it)
      const usersWithProfiles = data.map(user => ({
        ...user,
        profiles: profilesMap[user.user_id] || user.profiles
      }));

      console.log("DEBUG: Final users with profiles count:", usersWithProfiles.length);
      console.log("DEBUG: First user with profile:", usersWithProfiles[0]);
      console.log("DEBUG: First user's profile object:", usersWithProfiles[0]?.profiles);

      return NextResponse.json({ funnel: metrics, users: usersWithProfiles });
    }

    if (metric === "events") {
      const { data, error } = await sb
        .from("user_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Get user profile data separately to avoid join errors
      const userIds = [...new Set(data.filter(e => e.user_id).map(e => e.user_id))];
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await sb
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          
          if (!profilesError && profiles) {
            profilesMap = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, any>);
          }
        } catch (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        }
      }

      // Attach profile data to events
      const eventsWithProfiles = data.map(event => ({
        ...event,
        profiles: event.user_id ? profilesMap[event.user_id] : undefined
      }));

      return NextResponse.json({ events: eventsWithProfiles });
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
