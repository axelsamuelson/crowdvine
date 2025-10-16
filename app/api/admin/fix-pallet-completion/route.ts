import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    console.log("🔧 [Fix Pallet] Starting pallet completion fix...");
    
    const supabase = getSupabaseAdmin();
    
    // Get the problematic pallet
    const { data: pallet, error: palletError } = await supabase
      .from('pallets')
      .select('id, name, bottle_capacity, current_bottles, is_complete, status')
      .eq('id', '3985cbfe-178f-4fa1-a897-17183a1f18db')
      .single();
      
    if (palletError) {
      console.error("❌ [Fix Pallet] Error fetching pallet:", palletError);
      return NextResponse.json({ error: "Failed to fetch pallet" }, { status: 500 });
    }
    
    console.log("📊 [Fix Pallet] Current pallet state:", pallet);
    
    // Check if pallet is incorrectly marked as complete
    const isIncorrectlyComplete = pallet.is_complete && pallet.current_bottles < pallet.bottle_capacity;
    
    if (!isIncorrectlyComplete) {
      console.log("ℹ️ [Fix Pallet] Pallet completion status is correct");
      return NextResponse.json({ 
        message: "Pallet completion status is already correct",
        pallet: pallet 
      });
    }
    
    console.log("🔧 [Fix Pallet] Fixing incorrect completion status...");
    
    // Fix the pallet
    const { error: updateError } = await supabase
      .from('pallets')
      .update({
        is_complete: false,
        status: 'OPEN',
        completed_at: null,
        payment_deadline: null
      })
      .eq('id', pallet.id);
      
    if (updateError) {
      console.error("❌ [Fix Pallet] Error updating pallet:", updateError);
      return NextResponse.json({ error: "Failed to update pallet" }, { status: 500 });
    }
    
    // Fix reservations
    const { error: reservationError } = await supabase
      .from('order_reservations')
      .update({
        status: 'placed',
        payment_status: null,
        payment_deadline: null
      })
      .eq('pallet_id', pallet.id)
      .in('status', ['pending_payment']);
      
    if (reservationError) {
      console.error("❌ [Fix Pallet] Error updating reservations:", reservationError);
      return NextResponse.json({ error: "Failed to update reservations" }, { status: 500 });
    }
    
    // Get updated pallet
    const { data: updatedPallet } = await supabase
      .from('pallets')
      .select('id, name, bottle_capacity, current_bottles, is_complete, status')
      .eq('id', pallet.id)
      .single();
    
    console.log("✅ [Fix Pallet] Pallet completion status fixed");
    console.log("📊 [Fix Pallet] Updated pallet state:", updatedPallet);
    
    return NextResponse.json({
      success: true,
      message: "Pallet completion status fixed successfully",
      pallet: updatedPallet,
      fixed: {
        is_complete: false,
        status: 'OPEN',
        reservations_updated: true
      }
    });
    
  } catch (error) {
    console.error("❌ [Fix Pallet] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
