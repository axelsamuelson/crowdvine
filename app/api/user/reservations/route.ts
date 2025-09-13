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
      .from('order_reservations')
      .select(`
        id,
        order_id,
        status,
        created_at,
        pallet_id,
        pickup_zone_id,
        delivery_zone_id,
        pallets(name),
        pallet_zones!order_reservations_pickup_zone_id_fkey(name),
        pallet_zones!order_reservations_delivery_zone_id_fkey(name),
        order_reservation_items(
          wine_id,
          quantity,
          wines(wine_name, vintage)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      // If it's a relationship error, return empty array instead of error
      if (error.code === 'PGRST201' || error.message?.includes('relationship')) {
        console.log('Relationship error detected, returning empty array');
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedReservations = reservations?.map(reservation => {
      // Handle the zone data properly - we have separate pickup and delivery zone relationships
      const pickupZone = Array.isArray(reservation.pallet_zones) ? 
        reservation.pallet_zones.find((zone: any) => zone.id === reservation.pickup_zone_id) : 
        reservation.pallet_zones;
      
      const deliveryZone = Array.isArray(reservation.pallet_zones) ? 
        reservation.pallet_zones.find((zone: any) => zone.id === reservation.delivery_zone_id) : 
        reservation.pallet_zones;

      return {
        id: reservation.id,
        order_id: reservation.order_id,
        status: reservation.status,
        created_at: reservation.created_at,
        pallet_id: reservation.pallet_id,
        pallet_name: reservation.pallets?.name || 'Unknown Pallet',
        pickup_zone: pickupZone?.name || 'Unknown Pickup Zone',
        delivery_zone: deliveryZone?.name || 'Unknown Delivery Zone',
        items: reservation.order_reservation_items?.map(item => ({
          wine_name: item.wines?.wine_name || 'Unknown Wine',
          quantity: item.quantity,
          vintage: item.wines?.vintage || 'N/A'
        })) || []
      };
    }) || [];

    return NextResponse.json(transformedReservations);

  } catch (error) {
    console.error('Reservations API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}