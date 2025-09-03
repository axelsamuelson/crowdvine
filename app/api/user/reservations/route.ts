import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Get current user
    const cookieStore = cookies();
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user's reservations
    const { data: reservations, error: reservationsError } = await sb
      .from('order_reservations')
      .select(`
        id,
        status,
        created_at,
        pickup_zone_id,
        delivery_zone_id,
        user_addresses!inner (
          full_name,
          email,
          phone,
          address_street,
          address_postcode,
          address_city,
          country_code
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (reservationsError) {
      console.error('Failed to fetch reservations:', reservationsError);
      return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
    }

    // Get detailed information for each reservation
    const detailedReservations = await Promise.all(
      (reservations || []).map(async (reservation) => {
        // Get reservation items
        const { data: items, error: itemsError } = await sb
          .from('order_reservation_items')
          .select(`
            quantity,
            price_band,
            wines!inner (
              id,
              wine_name,
              vintage,
              grape_varieties,
              color,
              base_price_cents,
              producers!inner (
                name,
                region,
                country_code
              )
            )
          `)
          .eq('reservation_id', reservation.id);

        // Get zone information
        let zones = null;
        if (reservation.pickup_zone_id || reservation.delivery_zone_id) {
          const { data: zoneData, error: zoneError } = await sb
            .from('pallet_zones')
            .select('id, name, zone_type')
            .in('id', [reservation.pickup_zone_id, reservation.delivery_zone_id].filter(Boolean));

          if (!zoneError && zoneData) {
            zones = {
              pickup: zoneData.find(z => z.id === reservation.pickup_zone_id),
              delivery: zoneData.find(z => z.id === reservation.delivery_zone_id)
            };
          }
        }

        // Get pallet information if zones are available
        let pallet = null;
        if (zones?.pickup && zones?.delivery) {
          const { data: palletData, error: palletError } = await sb
            .from('pallets')
            .select(`
              id,
              name,
              bottle_capacity,
              pickup_zone_id,
              delivery_zone_id
            `)
            .eq('pickup_zone_id', zones.pickup.id)
            .eq('delivery_zone_id', zones.delivery.id)
            .single();

          if (!palletError && palletData) {
            // Get current bottle count for this pallet
            const { data: bookings, error: bookingsError } = await sb
              .from('bookings')
              .select('quantity');
            
            const currentBottles = bookingsError ? 0 : 
              bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;

            pallet = {
              ...palletData,
              currentBottles,
              remainingBottles: palletData.bottle_capacity - currentBottles
            };
          }
        }

        // Get tracking information
        const { data: tracking, error: trackingError } = await sb
          .from('reservation_tracking')
          .select('tracking_code, created_at')
          .eq('reservation_id', reservation.id)
          .single();

        return {
          id: reservation.id,
          status: reservation.status,
          created_at: reservation.created_at,
          address: reservation.user_addresses,
          zones,
          pallet,
          tracking: tracking ? {
            code: typeof tracking.tracking_code === 'string' ? tracking.tracking_code : 
                  tracking.tracking_code?.data || 'N/A',
            created_at: tracking.created_at
          } : null,
          items: items || []
        };
      })
    );

    return NextResponse.json({
      reservations: detailedReservations
    });

  } catch (error) {
    console.error('Error fetching user reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch user reservations' }, { status: 500 });
  }
}
