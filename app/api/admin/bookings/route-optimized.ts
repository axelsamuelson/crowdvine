import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * OPTIMIZED VERSION - Use after running migrations 045 & 046
 * 
 * This version uses:
 * 1. Automatic profiles join (via FK constraint)
 * 2. Optional: bookings_with_customers view for even better performance
 */

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    console.log("🔍 [Bookings API - Optimized] Starting to fetch bookings...");

    // Option 1: Use automatic FK join (simpler, one query)
    const { data: bookings, error: bookingsError } = await sb
      .from("bookings")
      .select(
        `
        id,
        quantity,
        band,
        status,
        created_at,
        user_id,
        pallet_id,
        wines(
          id,
          wine_name,
          vintage,
          grape_varieties,
          color,
          base_price_cents,
          producers(
            name,
            region,
            country_code
          )
        ),
        pallets(
          id,
          name,
          bottle_capacity
        ),
        profiles(
          email,
          first_name,
          last_name,
          full_name
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("❌ [Bookings API] Error fetching bookings:", bookingsError);
      return NextResponse.json({
        bookings: [],
        reservations: [],
        error: bookingsError.message
      });
    }

    console.log(`✅ [Bookings API] Found ${bookings?.length || 0} bookings with profiles`);

    // Fetch reservations with profiles join
    const { data: reservations, error: reservationsError } = await sb
      .from("order_reservations")
      .select(
        `
        id,
        status,
        created_at,
        user_id,
        order_id,
        payment_status,
        fulfillment_status,
        profiles(
          email,
          first_name,
          last_name,
          full_name
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("❌ [Bookings API] Error fetching reservations:", reservationsError);
      return NextResponse.json({
        bookings: bookings || [],
        reservations: [],
      });
    }

    console.log(`✅ [Bookings API] Found ${reservations?.length || 0} reservations with profiles`);

    return NextResponse.json({
      bookings: bookings || [],
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("❌ [Bookings API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Option 2: Use the view (EVEN SIMPLER - uncomment to use)
/*
export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    console.log("🔍 [Bookings API - View] Using bookings_with_customers view...");

    const { data: bookings, error: bookingsError } = await sb
      .from("bookings_with_customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("❌ Error:", bookingsError);
      return NextResponse.json({
        bookings: [],
        error: bookingsError.message
      });
    }

    // Transform view columns to match expected structure
    const transformedBookings = bookings?.map(b => ({
      ...b,
      profiles: {
        email: b.customer_email,
        first_name: b.customer_first_name,
        last_name: b.customer_last_name,
        full_name: b.customer_full_name,
      },
      wines: {
        wine_name: b.wine_name,
        vintage: b.vintage,
        color: b.wine_color,
        grape_varieties: b.grape_varieties,
        base_price_cents: b.base_price_cents,
        producers: {
          name: b.producer_name,
          region: b.producer_region,
        }
      },
      pallets: {
        name: b.pallet_name,
        bottle_capacity: b.pallet_capacity,
      }
    })) || [];

    console.log(`✅ [Bookings API] Found ${transformedBookings.length} bookings from view`);

    // Fetch reservations using view
    const { data: reservations } = await sb
      .from("orders_with_customers")
      .select("*")
      .order("created_at", { ascending: false });

    const transformedReservations = reservations?.map(r => ({
      ...r,
      profiles: {
        email: r.customer_email,
        first_name: r.customer_first_name,
        last_name: r.customer_last_name,
        full_name: r.customer_full_name,
      }
    })) || [];

    return NextResponse.json({
      bookings: transformedBookings,
      reservations: transformedReservations,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
*/

export async function DELETE(request: Request) {
  try {
    const { bookingIds } = await request.json();

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { error: "No booking IDs provided" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    const { error } = await sb.from("bookings").delete().in("id", bookingIds);

    if (error) {
      console.error("Error deleting bookings:", error);
      return NextResponse.json(
        { error: "Failed to delete bookings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Successfully deleted ${bookingIds.length} booking(s)`,
    });
  } catch (error) {
    console.error("Error in delete bookings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

