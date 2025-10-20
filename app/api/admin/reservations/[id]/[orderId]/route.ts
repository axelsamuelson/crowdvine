import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  try {
    const orderId = params.orderId;
    const sb = getSupabaseAdmin();

    // Fetch reservation by ID with customer info
    const { data: reservation, error: reservationError } = await sb
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
        profiles!inner(
          email,
          first_name,
          last_name,
          full_name
        )
      `,
      )
      .eq("order_id", orderId)
      .single();

    if (reservationError) {
      console.error("Error fetching reservation:", reservationError);
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      reservations: reservation ? [reservation] : [],
    });
  } catch (error) {
    console.error("Error in reservation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
