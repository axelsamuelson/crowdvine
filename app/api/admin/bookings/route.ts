import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const sb = await supabaseServer();

  // Hämta alla bokningar med relaterad data
  const { data: bookings, error } = await sb
    .from('bookings')
    .select(`
      id,
      quantity,
      band,
      created_at,
      wines(
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        base_price_cents,
        producers(
          name,
          region,
          country_code
        )
      ),
      pallets(
        id,
        name,
        bottle_capacity,
        delivery_zone:pallet_zones!delivery_zone_id(name),
        pickup_zone:pallet_zones!pickup_zone_id(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Beräkna statistik
  const totalBookings = bookings?.length || 0;
  const totalBottles = bookings?.reduce((sum, b) => sum + b.quantity, 0) || 0;
  const totalValue = bookings?.reduce((sum, b) => sum + (b.quantity * (b.wines?.base_price_cents || 0)), 0) || 0;

  return NextResponse.json({
    bookings: bookings || [],
    stats: {
      totalBookings,
      totalBottles,
      totalValue
    }
  });
}
