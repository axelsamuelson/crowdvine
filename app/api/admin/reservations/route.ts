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

    // Hämta alla reservations med relaterad data inklusive customer info
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
        fulfillment_status,
      `,
      )
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      console.error("Reservations error details:", {
        code: reservationsError.code,
        message: reservationsError.message,
        details: reservationsError.details,
        hint: reservationsError.hint
      });
      
      // Return empty array instead of error to prevent 500
      return NextResponse.json({
        reservations: [],
        note: "No reservations found or database error occurred",
        error: reservationsError.message
      });
    }

    return NextResponse.json({
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("Error in reservations API:", error);
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
