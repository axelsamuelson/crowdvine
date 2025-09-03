import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const sb = await supabaseServer();
    
    const { data: reservations, error } = await sb
      .from('order_reservations')
      .select(`
        id,
        status,
        created_at,
        user_addresses (
          full_name,
          email,
          address_street,
          address_postcode,
          address_city,
          country_code
        ),
        order_reservation_items (
          id,
          quantity,
          price_band,
          wines (
            wine_name,
            vintage
          )
        ),
        pallet_zones!delivery_zone_id (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(reservations || []);
  } catch (error) {
    console.error('Reservations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
