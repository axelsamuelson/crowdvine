import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Debug booking to item relationship
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get a few bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, item_id, pallet_id, user_id")
      .limit(5);

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    // Get a few order_reservation_items
    const { data: items, error: itemsError } = await supabase
      .from("order_reservation_items")
      .select("id, reservation_id, quantity")
      .limit(5);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Check if any booking.item_id matches any order_reservation_items.id
    const bookingItemIds = bookings?.map(b => b.item_id) || [];
    const orderItemIds = items?.map(i => i.id) || [];
    
    const matches = bookingItemIds.filter(id => orderItemIds.includes(id));

    return NextResponse.json({
      bookings: bookings?.map(b => ({
        id: b.id,
        item_id: b.item_id,
        pallet_id: b.pallet_id,
        user_id: b.user_id,
      })),
      order_reservation_items: items?.map(i => ({
        id: i.id,
        reservation_id: i.reservation_id,
        quantity: i.quantity,
      })),
      analysis: {
        booking_item_ids: bookingItemIds,
        order_item_ids: orderItemIds,
        matching_ids: matches,
        note: "If no matches, bookings.item_id does NOT refer to order_reservation_items.id",
      },
    });

  } catch (error) {
    console.error("Debug booking items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

