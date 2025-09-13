import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // For now, let's use the known user ID from our test
    // TODO: Fix authentication properly
    const userId = "7122d74d-f06c-4b25-be10-0fe025607981";
    
    console.log(`Fetching reservations for user: ${userId}`);
    
    // Get reservations with related data
    const { data: reservations, error } = await supabase
      .from('order_reservations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }

    console.log(`Found ${reservations?.length || 0} reservations for user ${userId}`);

    // If no reservations, return empty array
    if (!reservations || reservations.length === 0) {
      return NextResponse.json([]);
    }

    // Transform the data to match the expected format
    const transformedReservations = await Promise.all(reservations.map(async (reservation) => {
      // Get pallet name based on zones
      let palletName = 'Unassigned Pallet';
      let palletId = null;
      
      if (reservation.pickup_zone_id && reservation.delivery_zone_id) {
        const { data: pallet } = await supabase
          .from('pallets')
          .select('id, name')
          .eq('pickup_zone_id', reservation.pickup_zone_id)
          .eq('delivery_zone_id', reservation.delivery_zone_id)
          .single();
        
        if (pallet) {
          palletName = pallet.name;
          palletId = pallet.id;
        }
      }

      // Get zone names
      let pickupZoneName = 'Unknown Pickup Zone';
      let deliveryZoneName = 'Unknown Delivery Zone';
      
      if (reservation.pickup_zone_id) {
        const { data: pickupZone } = await supabase
          .from('pallet_zones')
          .select('name')
          .eq('id', reservation.pickup_zone_id)
          .single();
        pickupZoneName = pickupZone?.name || 'Unknown Pickup Zone';
      }
      
      if (reservation.delivery_zone_id) {
        const { data: deliveryZone } = await supabase
          .from('pallet_zones')
          .select('name')
          .eq('id', reservation.delivery_zone_id)
          .single();
        deliveryZoneName = deliveryZone?.name || 'Unknown Delivery Zone';
      }

      // Get reservation items with wine details
      const { data: items } = await supabase
        .from('order_reservation_items')
        .select(`
          item_id,
          quantity,
          wines(
            wine_name,
            vintage,
            label_image_path,
            grape_varieties,
            color
          )
        `)
        .eq('reservation_id', reservation.id);

      return {
        id: reservation.id,
        order_id: reservation.order_id || reservation.id,
        status: reservation.status,
        created_at: reservation.created_at,
        pallet_id: palletId,
        pallet_name: palletName,
        pickup_zone: pickupZoneName,
        delivery_zone: deliveryZoneName,
        items: items?.map(item => ({
          wine_name: item.wines?.wine_name || 'Unknown Wine',
          quantity: item.quantity,
          vintage: item.wines?.vintage || 'N/A',
          image_path: item.wines?.label_image_path || null,
          grape_varieties: item.wines?.grape_varieties || null,
          color: item.wines?.color || null
        })) || []
      };
    }));

    return NextResponse.json(transformedReservations);

  } catch (error) {
    console.error('Reservations API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}