import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get user's reservations with related data
    const { data: reservations, error } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        order_id,
        status,
        created_at,
        pallet_id,
        pallet_zones(name),
        order_reservation_items(
          wine_id,
          quantity,
          wines(wine_name, vintage)
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reservations:", error);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 },
      );
    }

    // Transform the data to match the expected format
    const transformedReservations =
      reservations?.map((reservation) => ({
        id: reservation.id,
        order_id: reservation.order_id,
        status: reservation.status,
        created_at: reservation.created_at,
        pallet_id: reservation.pallet_id,
        pallet_name: reservation.pallet_zones?.name,
        delivery_zone: reservation.pallet_zones?.name,
        items:
          reservation.order_reservation_items?.map((item) => ({
            wine_name: item.wines?.wine_name || "Unknown Wine",
            quantity: item.quantity,
            vintage: item.wines?.vintage || "N/A",
          })) || [],
      })) || [];

    return NextResponse.json(transformedReservations);
  } catch (error) {
    console.error("Reservations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
