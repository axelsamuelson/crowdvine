import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST() {
  try {
    const sb = await supabaseServer();
    
    // Uppdatera alla bookings som inte har pallet_id
    const { data, error } = await sb
      .from('bookings')
      .update({ pallet_id: 'e52de098-3d0f-4e5f-a363-b856da907183' })
      .is('pallet_id', null)
      .select('id, pallet_id');
    
    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Hämta statistik efter uppdateringen
    const { data: stats } = await sb
      .from('bookings')
      .select('quantity, pallet_id');
    
    const totalBookings = stats?.length || 0;
    const bookingsWithPallet = stats?.filter(b => b.pallet_id).length || 0;
    const totalBottles = stats?.reduce((sum, b) => sum + b.quantity, 0) || 0;
    
    return NextResponse.json({
      success: true,
      updatedBookings: data?.length || 0,
      stats: {
        totalBookings,
        bookingsWithPallet,
        totalBottles
      }
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
