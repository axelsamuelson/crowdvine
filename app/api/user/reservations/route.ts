import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Fetch real reservations from database
    const { data: reservations, error: reservationsError } = await supabase
      .from('order_reservations')
      .select(`
        id,
        status,
        created_at,
        pickup_zone_id,
        delivery_zone_id,
        user_addresses (
          full_name,
          email,
          phone,
          address_street,
          address_postcode,
          address_city,
          country_code
        ),
        order_reservation_items (
          quantity,
          price_band,
          wines (
            id,
            wine_name,
            vintage,
            grape_varieties,
            color,
            base_price_cents,
            producers (
              name,
              region,
              country_code
            )
          )
        ),
        reservation_tracking (
          tracking_code,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (reservationsError) {
      console.error('Error fetching reservations:', reservationsError);
      return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedReservations = await Promise.all(
      (reservations || []).map(async (reservation) => {
        // Fetch zone information if available
        let zones = null;
        if (reservation.pickup_zone_id || reservation.delivery_zone_id) {
          const zoneQueries = [];
          
          if (reservation.pickup_zone_id) {
            zoneQueries.push(
              supabase
                .from('pallet_zones')
                .select('name, zone_type')
                .eq('id', reservation.pickup_zone_id)
                .single()
            );
          }
          
          if (reservation.delivery_zone_id) {
            zoneQueries.push(
              supabase
                .from('pallet_zones')
                .select('name, zone_type')
                .eq('id', reservation.delivery_zone_id)
                .single()
            );
          }
          
          const zoneResults = await Promise.all(zoneQueries);
          const pickupZone = zoneResults[0]?.data;
          const deliveryZone = zoneResults[1]?.data;
          
          zones = {
            pickup: pickupZone,
            delivery: deliveryZone
          };
        }

        // Fetch pallet information if we have both zones
        let pallet = null;
        if (reservation.pickup_zone_id && reservation.delivery_zone_id) {
          const { data: pallets } = await supabase
            .from('pallets')
            .select(`
              id,
              name,
              bottle_capacity,
              pallet_zones!inner(id)
            `)
            .eq('pallet_zones.id', reservation.pickup_zone_id)
            .eq('pallet_zones.id', reservation.delivery_zone_id)
            .limit(1);

          if (pallets && pallets.length > 0) {
            const palletData = pallets[0];
            
            // Calculate current bottles from bookings
            const { data: bookings } = await supabase
              .from('bookings')
              .select('quantity')
              .eq('pallet_id', palletData.id);
            
            const currentBottles = bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
            const remainingBottles = palletData.bottle_capacity - currentBottles;
            
            pallet = {
              id: palletData.id,
              name: palletData.name,
              bottle_capacity: palletData.bottle_capacity,
              currentBottles,
              remainingBottles
            };
          }
        }

        return {
          id: reservation.id,
          status: reservation.status,
          created_at: reservation.created_at,
          address: reservation.user_addresses,
          zones,
          pallet,
          items: reservation.order_reservation_items?.map(item => ({
            quantity: item.quantity,
            price_band: item.price_band,
            wines: item.wines
          })) || [],
          tracking: reservation.reservation_tracking ? {
            code: reservation.reservation_tracking.tracking_code,
            created_at: reservation.reservation_tracking.created_at
          } : null
        };
      })
    );

    return NextResponse.json({ 
      reservations: transformedReservations,
      message: 'User reservations fetched successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name
      }
    });
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
