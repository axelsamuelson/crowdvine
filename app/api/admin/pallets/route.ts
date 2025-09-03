import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('pallets')
    .select(`
      *,
      delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
      pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type),
      bookings!inner(
        quantity,
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
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform data to include calculated fields
  const transformedData = (data || []).map(pallet => {
    const totalBookedBottles = pallet.bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
    const remainingBottles = pallet.bottle_capacity - totalBookedBottles;
    const completionPercentage = (totalBookedBottles / pallet.bottle_capacity) * 100;

    // Group wines by type for summary
    const wineSummary = pallet.bookings?.reduce((acc, booking) => {
      const wine = booking.wines;
      const key = `${wine.wine_name}-${wine.vintage}`;
      if (!acc[key]) {
        acc[key] = {
          wine_name: wine.wine_name,
          vintage: wine.vintage,
          grape_varieties: wine.grape_varieties,
          color: wine.color,
          producer: wine.producers.name,
          total_quantity: 0,
          base_price_cents: wine.base_price_cents
        };
      }
      acc[key].total_quantity += booking.quantity;
      return acc;
    }, {} as Record<string, any>) || {};

    return {
      ...pallet,
      total_booked_bottles: totalBookedBottles,
      remaining_bottles: remainingBottles,
      completion_percentage: completionPercentage,
      wine_summary: Object.values(wineSummary),
      is_complete: totalBookedBottles >= pallet.bottle_capacity,
      needs_ordering: remainingBottles > 0
    };
  });

  return NextResponse.json(transformedData);
}

export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const body = await request.json();

  const { data, error } = await sb
    .from('pallets')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
