import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }

    // Update reservation with zone information
    const { error: updateError } = await sb
      .from('order_reservations')
      .update({
        pickup_zone_id: '85eaec48-f97b-45e6-947d-500b332dd0b1',
        delivery_zone_id: 'c45439d7-3d3a-46c2-8fdf-77f546b2ea74'
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('Failed to update reservation with zones:', updateError);
      return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Reservation updated with zone information'
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
