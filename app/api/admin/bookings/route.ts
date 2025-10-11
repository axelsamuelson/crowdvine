import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    console.log("🔍 [Bookings API] Starting to fetch bookings...");

    // Hämta alla bokningar med relaterad data (without profiles join for now)
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
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("❌ [Bookings API] Error fetching bookings:", bookingsError);
      console.error("Bookings error details:", {
        code: bookingsError.code,
        message: bookingsError.message,
        details: bookingsError.details,
        hint: bookingsError.hint
      });
      
      return NextResponse.json({
        bookings: [],
        reservations: [],
        error: bookingsError.message
      });
    }

    console.log(`✅ [Bookings API] Found ${bookings?.length || 0} bookings`);

    // Manually fetch profiles for bookings user_ids
    let bookingsWithProfiles = bookings || [];
    if (bookings && bookings.length > 0) {
      const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];
      console.log(`🔍 [Bookings API] Fetching profiles for ${userIds.length} unique users`);

      const { data: profiles, error: profilesError } = await sb
        .from("profiles")
        .select("id, email, first_name, last_name, full_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("❌ [Bookings API] Error fetching profiles:", profilesError);
      } else {
        console.log(`✅ [Bookings API] Found ${profiles?.length || 0} profiles`);
        
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        bookingsWithProfiles = bookings.map(booking => ({
          ...booking,
          profiles: profilesMap.get(booking.user_id) || null
        }));
      }
    }

    // Hämta reservations för att få kundinformation och order ID
    console.log("🔍 [Bookings API] Fetching reservations...");
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
        fulfillment_status
      `,
      )
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("❌ [Bookings API] Error fetching reservations:", reservationsError);
      return NextResponse.json({
        bookings: bookingsWithProfiles,
        reservations: [],
      });
    }

    console.log(`✅ [Bookings API] Found ${reservations?.length || 0} reservations`);

    // Attach profiles to reservations too
    let reservationsWithProfiles = reservations || [];
    if (reservations && reservations.length > 0) {
      const resUserIds = [...new Set(reservations.map(r => r.user_id).filter(Boolean))];
      
      const { data: resProfiles, error: resProfilesError } = await sb
        .from("profiles")
        .select("id, email, first_name, last_name, full_name")
        .in("id", resUserIds);

      if (!resProfilesError && resProfiles) {
        const resProfilesMap = new Map(resProfiles.map(p => [p.id, p]));
        reservationsWithProfiles = reservations.map(reservation => ({
          ...reservation,
          profiles: resProfilesMap.get(reservation.user_id) || null
        }));
      }
    }

    console.log(`✅ [Bookings API] Returning data with profiles attached`);
    return NextResponse.json({
      bookings: bookingsWithProfiles,
      reservations: reservationsWithProfiles,
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
