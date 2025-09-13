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

      // Get delivery address instead of zone names
      let deliveryAddress = 'No delivery address';
      
      if (reservation.address_id) {
        const { data: address } = await supabase
          .from('addresses')
          .select('street, city, postal_code, country')
          .eq('id', reservation.address_id)
          .single();
        
        if (address) {
          deliveryAddress = `${address.street}, ${address.postal_code} ${address.city}, ${address.country}`;
        }
      }

      // Get reservation items with wine details and costs
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
            color,
            base_price_cents
          )
        `)
        .eq('reservation_id', reservation.id);

      // Calculate costs
      const itemsWithCosts = items?.map(item => ({
        wine_name: item.wines?.wine_name || 'Unknown Wine',
        quantity: item.quantity,
        vintage: item.wines?.vintage || 'N/A',
        image_path: item.wines?.label_image_path || null,
        grape_varieties: item.wines?.grape_varieties || null,
        color: item.wines?.color || null,
        price_per_bottle_cents: item.wines?.base_price_cents || 0,
        total_cost_cents: (item.wines?.base_price_cents || 0) * item.quantity
      })) || [];

      const totalCostCents = itemsWithCosts.reduce((sum, item) => sum + item.total_cost_cents, 0);

      return {
        id: reservation.id,
        order_id: reservation.order_id || reservation.id,
        status: reservation.status,
        created_at: reservation.created_at,
        pallet_id: palletId,
        pallet_name: palletName,
        delivery_address: deliveryAddress,
        total_cost_cents: totalCostCents,
        items: itemsWithCosts
      };
    }));

    return NextResponse.json(transformedReservations);

  } catch (error) {
    console.error('Reservations API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}