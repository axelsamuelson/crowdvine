import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const sb = await supabaseServer();
    
    // Test 1: Check if reservation_tracking table exists
    const { data: tableCheck, error: tableError } = await sb
      .from('reservation_tracking')
      .select('id')
      .limit(1);
    
    // Test 2: Check if generate_tracking_code function exists
    const { data: functionCheck, error: functionError } = await sb
      .rpc('generate_tracking_code');
    
    // Test 3: Check if order_reservations table exists
    const { data: orderCheck, error: orderError } = await sb
      .from('order_reservations')
      .select('id')
      .limit(1);
    
    return NextResponse.json({
      reservation_tracking: {
        exists: !tableError,
        error: tableError?.message,
        count: tableCheck?.length || 0
      },
      generate_tracking_code: {
        exists: !functionError,
        error: functionError?.message,
        result: functionCheck
      },
      order_reservations: {
        exists: !orderError,
        error: orderError?.message,
        count: orderCheck?.length || 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
