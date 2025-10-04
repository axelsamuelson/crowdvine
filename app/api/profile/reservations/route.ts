import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's reservations with related data
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(`
        id,
        order_id,
        status,
        created_at,
        pickup_zone_id,
        delivery_zone_id,
        payment_status,
        fulfillment_status,
        order_reservation_items (
          id,
          quantity,
          wine_id,
          wines (
            id,
            wine_name,
            vintage,
            producers (
              name
            )
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("Error in reservations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
