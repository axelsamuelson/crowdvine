import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    console.log("🔧 [Fix Pallet] Starting pallet fix...");
    
    const supabase = getSupabaseAdmin();
    
    // Fix the specific problematic pallet
    const palletId = '3985cbfe-178f-4fa1-a897-17183a1f18db';
    
    console.log(`🔧 [Fix Pallet] Fixing pallet ${palletId}...`);
    
    // Fix the pallet - set to not complete
    const { error: palletError } = await supabase
      .from('pallets')
      .update({
        is_complete: false,
        status: 'OPEN',
        completed_at: null,
        payment_deadline: null
      })
      .eq('id', palletId);
      
    if (palletError) {
      console.error("❌ [Fix Pallet] Error updating pallet:", palletError);
      return NextResponse.json({ error: "Failed to update pallet" }, { status: 500 });
    }
    
    console.log("✅ [Fix Pallet] Pallet updated successfully");
    
    // Fix reservations for this pallet
    const { error: reservationError } = await supabase
      .from('order_reservations')
      .update({
        status: 'placed',
        payment_status: null,
        payment_deadline: null
      })
      .eq('pallet_id', palletId)
      .in('status', ['pending_payment']);
      
    if (reservationError) {
      console.error("❌ [Fix Pallet] Error updating reservations:", reservationError);
      return NextResponse.json({ error: "Failed to update reservations" }, { status: 500 });
    }
    
    console.log("✅ [Fix Pallet] Reservations updated successfully");
    
    // Verify the fix
    const { data: pallet } = await supabase
      .from('pallets')
      .select('id, name, is_complete, status')
      .eq('id', palletId)
      .single();
    
    return NextResponse.json({
      success: true,
      message: "Pallet fix completed successfully",
      pallet: pallet
    });
    
  } catch (error) {
    console.error("❌ [Fix Pallet] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
