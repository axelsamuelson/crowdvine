import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Debug endpoint to check pallet and reservation data
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get all pallets
    const { data: pallets, error: palletsError } = await supabase
      .from("pallets")
      .select("id, name, pickup_zone_id, delivery_zone_id, bottle_capacity");

    if (palletsError) {
      return NextResponse.json({ error: palletsError.message }, { status: 500 });
    }

    // Get all reservations
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select("id, pallet_id, pickup_zone_id, delivery_zone_id, status")
      .limit(20);

    if (reservationsError) {
      return NextResponse.json({ error: reservationsError.message }, { status: 500 });
    }

    // Count reservations by pallet_id
    const reservationsByPallet = new Map();
    reservations?.forEach(res => {
      const palletId = res.pallet_id || 'NULL';
      reservationsByPallet.set(palletId, (reservationsByPallet.get(palletId) || 0) + 1);
    });

    return NextResponse.json({
      pallets: {
        total: pallets?.length || 0,
        data: pallets?.map(p => ({
          id: p.id,
          name: p.name,
          pickup_zone_id: p.pickup_zone_id,
          delivery_zone_id: p.delivery_zone_id,
          bottle_capacity: p.bottle_capacity,
        })),
      },
      reservations: {
        total: reservations?.length || 0,
        sample: reservations?.map(r => ({
          id: r.id,
          pallet_id: r.pallet_id,
          pickup_zone_id: r.pickup_zone_id,
          delivery_zone_id: r.delivery_zone_id,
          status: r.status,
        })),
      },
      reservationsByPalletId: Object.fromEntries(reservationsByPallet),
    });

  } catch (error) {
    console.error("Debug pallet data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

