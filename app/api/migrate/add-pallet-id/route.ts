import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Check if pallet_id column exists
    const { data: bookings, error: bookingsError } = await sb
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to query bookings', details: bookingsError });
    }
    
    const hasPalletId = bookings && bookings.length > 0 && 'pallet_id' in bookings[0];
    
    return NextResponse.json({ 
      hasPalletId,
      sampleBooking: bookings?.[0] || null
    });
  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
