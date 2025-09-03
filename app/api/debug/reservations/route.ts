import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const sb = await supabaseServer();
    
    // Test 1: Check order_reservations table structure
    const { data: tableInfo, error: tableError } = await sb
      .from('order_reservations')
      .select('*')
      .limit(1);
    
    // Test 2: Try to insert a test reservation
    const { data: testReservation, error: insertError } = await sb
      .from('order_reservations')
      .insert({
        user_id: null,
        cart_id: 'test-cart-id',
        address_id: 'test-address-id',
        status: 'placed'
      })
      .select()
      .single();
    
    // Test 3: Check user_addresses table
    const { data: addressInfo, error: addressError } = await sb
      .from('user_addresses')
      .select('*')
      .limit(1);
    
    return NextResponse.json({
      order_reservations: {
        tableInfo: tableInfo,
        tableError: tableError?.message,
        insertTest: testReservation,
        insertError: insertError?.message
      },
      user_addresses: {
        addressInfo: addressInfo,
        addressError: addressError?.message
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
