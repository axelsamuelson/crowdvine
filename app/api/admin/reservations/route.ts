import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for admin operations (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    console.log("🔍 [Reservations API] Starting to fetch reservations...");

    // Try fetching with profiles join first
    const { data: reservations, error: reservationsError } = await sb
      .from("order_reservations")
      .select(
        `
        id,
        status,
        created_at,
        user_id,
        order_id,
        delivery_zone_id,
        pickup_zone_id,
        payment_status,
        fulfillment_status
      `,
      )
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("❌ [Reservations API] Error fetching reservations:", reservationsError);
      console.error("Error details:", {
        code: reservationsError.code,
        message: reservationsError.message,
        details: reservationsError.details,
        hint: reservationsError.hint
      });
      
      return NextResponse.json({
        reservations: [],
        error: reservationsError.message
      });
    }

    console.log(`✅ [Reservations API] Found ${reservations?.length || 0} reservations`);

    // Manually fetch profiles for all user_ids
    if (reservations && reservations.length > 0) {
      const userIds = [...new Set(reservations.map(r => r.user_id).filter(Boolean))];
      console.log(`🔍 [Reservations API] Fetching profiles for ${userIds.length} unique users`);

      const { data: profiles, error: profilesError } = await sb
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("❌ [Reservations API] Error fetching profiles:", profilesError);
      } else {
        console.log(`✅ [Reservations API] Found ${profiles?.length || 0} profiles`);
        
        // Create a map for quick lookup
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        // Attach profiles to reservations
        const reservationsWithProfiles = reservations.map(reservation => ({
          ...reservation,
          profiles: profilesMap.get(reservation.user_id) || null
        }));

        console.log(`✅ [Reservations API] Returning ${reservationsWithProfiles.length} reservations with profiles`);
        return NextResponse.json({
          reservations: reservationsWithProfiles,
        });
      }
    }

    return NextResponse.json({
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("❌ [Reservations API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { reservationIds } = await request.json();

    if (
      !reservationIds ||
      !Array.isArray(reservationIds) ||
      reservationIds.length === 0
    ) {
      return NextResponse.json(
        { error: "No reservation IDs provided" },
        { status: 400 },
      );
    }

    console.log("DELETE request received for reservations:", reservationIds);

    const sb = getSupabaseAdmin();

    // Count reservations before deletion
    const { count: beforeCount } = await sb
      .from("order_reservations")
      .select("*", { count: "exact", head: true });

    console.log("Reservations before deletion:", beforeCount);

    // Delete reservation items first (foreign key constraint)
    console.log("Deleting reservation items...");
    const { error: itemsError } = await sb
      .from("order_reservation_items")
      .delete()
      .in("reservation_id", reservationIds);

    if (itemsError) {
      console.error("Error deleting reservation items:", itemsError);
      return NextResponse.json(
        { error: "Failed to delete reservation items" },
        { status: 500 },
      );
    }

    console.log("Reservation items deleted");

    // Delete reservations
    console.log("Deleting reservations...");
    const { error: reservationsError } = await sb
      .from("order_reservations")
      .delete()
      .in("id", reservationIds);

    if (reservationsError) {
      console.error("Error deleting reservations:", reservationsError);
      return NextResponse.json(
        { error: "Failed to delete reservations" },
        { status: 500 },
      );
    }

    console.log("Reservations deleted");

    // Count reservations after deletion
    const { count: afterCount } = await sb
      .from("order_reservations")
      .select("*", { count: "exact", head: true });

    console.log("Reservations after deletion:", afterCount);

    const deletedCount = (beforeCount || 0) - (afterCount || 0);

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} reservation(s)`,
      deletedCount: deletedCount,
      remainingCount: afterCount,
    });
  } catch (error) {
    console.error("Error in delete reservations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
