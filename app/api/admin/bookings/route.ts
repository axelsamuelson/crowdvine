import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Hämta alla bokningar med relaterad data inklusive user profiles
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
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 },
      );
    }

    console.log(`Found ${bookings?.length || 0} bookings`);

    // Hämta reservations för att få kundinformation och order ID med user profiles
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
      console.error("Error fetching reservations:", reservationsError);
      // Return bookings even if reservations fail
      return NextResponse.json({
        bookings: bookings || [],
        reservations: [],
      });
    }

    console.log(`Found ${reservations?.length || 0} reservations`);

    return NextResponse.json({
      bookings: bookings || [],
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("Error in bookings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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
