import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Check pallet_zones
    const { data: zones, error: zonesError } = await sb
      .from('pallet_zones')
      .select('*');
    
    // Check pallets
    const { data: pallets, error: palletsError } = await sb
      .from('pallets')
      .select('*');
    
    // Check producers
    const { data: producers, error: producersError } = await sb
      .from('producers')
      .select('*');
    
    // Check bookings
    const { data: bookings, error: bookingsError } = await sb
      .from('bookings')
      .select('*');

    return NextResponse.json({
      zones: { data: zones, error: zonesError },
      pallets: { data: pallets, error: palletsError },
      producers: { data: producers, error: producersError },
      bookings: { data: bookings, error: bookingsError }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 });
  }
}
