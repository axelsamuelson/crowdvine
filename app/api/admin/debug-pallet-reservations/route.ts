import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Debug endpoint to check pallet reservations
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const palletId = searchParams.get('palletId') || '3a4ddb5f-a3b6-477a-905e-951e91eab774';

    const supabase = getSupabaseAdmin();

    // Get pallet info
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select("*")
      .eq("id", palletId)
      .single();

    if (palletError) {
      return NextResponse.json({ error: palletError.message }, { status: 500 });
    }

    // Get reservations with pallet_id
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(`
        id,
        user_id,
        pallet_id,
        pickup_zone_id,
        delivery_zone_id,
        status,
        created_at,
        profiles(email, full_name)
      `)
      .eq("pallet_id", palletId);

    if (reservationsError) {
      return NextResponse.json({ error: reservationsError.message }, { status: 500 });
    }

    // Get items for each reservation
    const reservationsWithItems = await Promise.all(
      (reservations || []).map(async (res) => {
        const { data: items } = await supabase
          .from("order_reservation_items")
          .select(`
            id,
            quantity,
            wines(wine_name, vintage)
          `)
          .eq("reservation_id", res.id);

        return {
          ...res,
          items: items || [],
          bottles: items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        };
      })
    );

    return NextResponse.json({
      pallet: {
        id: pallet.id,
        name: pallet.name,
        pickup_zone_id: pallet.pickup_zone_id,
        delivery_zone_id: pallet.delivery_zone_id,
        bottle_capacity: pallet.bottle_capacity,
      },
      reservations: reservationsWithItems,
      summary: {
        total_reservations: reservationsWithItems.length,
        total_bottles: reservationsWithItems.reduce((sum, r) => sum + r.bottles, 0),
        users: reservationsWithItems.map(r => ({
          id: r.user_id,
          name: r.profiles?.full_name || 'Unknown',
          email: r.profiles?.email || 'Unknown',
          bottles: r.bottles,
        })),
      },
    });

  } catch (error) {
    console.error("Debug pallet reservations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

