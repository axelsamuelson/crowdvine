import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    
    // Get specific reservation with related data
    const { data: reservation, error } = await supabase
      .from('order_reservations')
      .select(`
        id,
        order_id,
        status,
        created_at,
        pallet_id,
        pickup_zone_id,
        delivery_zone_id,
        delivery_address,
        total_amount_cents,
        shipping_cost_cents,
        pallets(name, cost_cents, bottle_capacity),
        pallet_zones!order_reservations_pickup_zone_id_fkey(name),
        pallet_zones!order_reservations_delivery_zone_id_fkey(name),
        order_reservation_items(
          wine_id,
          quantity,
          wines(wine_name, vintage, base_price_cents)
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching reservation:', error);
      return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
    }

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Handle the zone data properly - we have separate pickup and delivery zone relationships
    const pickupZone = Array.isArray(reservation.pallet_zones) ? 
      reservation.pallet_zones.find((zone: any) => zone.id === reservation.pickup_zone_id) : 
      reservation.pallet_zones;
    
    const deliveryZone = Array.isArray(reservation.pallet_zones) ? 
      reservation.pallet_zones.find((zone: any) => zone.id === reservation.delivery_zone_id) : 
      reservation.pallet_zones;

    // Transform the data to match the expected format
    const transformedReservation = {
      id: reservation.id,
      order_id: reservation.order_id,
      status: reservation.status,
      created_at: reservation.created_at,
      pallet_id: reservation.pallet_id,
      pallet_name: reservation.pallets?.name || 'Unknown Pallet',
      pallet_cost_cents: reservation.pallets?.cost_cents || 0,
      pallet_capacity: reservation.pallets?.bottle_capacity || 0,
      pickup_zone: pickupZone?.name || 'Unknown Pickup Zone',
      delivery_zone: deliveryZone?.name || 'Unknown Delivery Zone',
      delivery_address: reservation.delivery_address || null,
      total_amount_cents: reservation.total_amount_cents || 0,
      shipping_cost_cents: reservation.shipping_cost_cents || 0,
      items: reservation.order_reservation_items?.map(item => ({
        wine_name: item.wines?.wine_name || 'Unknown Wine',
        quantity: item.quantity,
        vintage: item.wines?.vintage || 'N/A',
        price_cents: item.wines?.base_price_cents || 0
      })) || []
    };

    return NextResponse.json(transformedReservation);

  } catch (error) {
    console.error('Reservation API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
