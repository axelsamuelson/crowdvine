import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }

    // Get reservation items
    const { data: items, error: itemsError } = await sb
      .from('order_reservation_items')
      .select('*')
      .eq('reservation_id', reservationId);

    // Get reservation details
    const { data: reservation, error: reservationError } = await sb
      .from('order_reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    // Get wines
    const { data: wines, error: winesError } = await sb
      .from('wines')
      .select('*')
      .limit(5);

    return NextResponse.json({
      items: { data: items, error: itemsError },
      reservation: { data: reservation, error: reservationError },
      wines: { data: wines, error: winesError }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
