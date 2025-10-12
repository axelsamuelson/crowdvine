import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkPalletCompletion } from "@/lib/pallet-completion";

async function checkAllPallets() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get all pallets that are not yet complete
    const { data: pallets, error: palletsError } = await supabase
      .from('pallets')
      .select('id, name, bottle_capacity, status, is_complete')
      .or('is_complete.is.null,is_complete.eq.false');
    
    if (palletsError) {
      console.error("Error fetching pallets:", palletsError);
      return NextResponse.json(
        { error: "Failed to fetch pallets" },
        { status: 500 }
      );
    }

    const results = [];
    
    for (const pallet of pallets || []) {
      try {
        console.log(`\n🔍 Checking pallet: ${pallet.name} (${pallet.id})`);
        console.log(`   Capacity: ${pallet.bottle_capacity} bottles`);
        
        // Count reserved bottles for this pallet from order_reservation_items
        const { data: reservations } = await supabase
          .from('order_reservations')
          .select('id, status')
          .eq('pallet_id', pallet.id)
          .in('status', ['placed', 'pending_payment', 'confirmed']);
        
        // Count bottles from order_reservation_items
        let totalBottles = 0;
        for (const reservation of reservations || []) {
          const { data: items } = await supabase
            .from('order_reservation_items')
            .select('quantity')
            .eq('reservation_id', reservation.id);
          
          const reservationBottles = items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          totalBottles += reservationBottles;
          console.log(`   Reservation ${reservation.id}: ${reservationBottles} bottles (${reservation.status})`);
        }
        
        console.log(`   Total Reserved: ${totalBottles} bottles`);
        
        const isComplete = await checkPalletCompletion(pallet.id);
        
        results.push({
          palletId: pallet.id,
          palletName: pallet.name,
          capacity: pallet.bottle_capacity,
          reserved: totalBottles,
          wasCompleted: isComplete,
          status: isComplete ? '✅ COMPLETED - Payment emails sent!' : `⏳ Not full yet (${totalBottles}/${pallet.bottle_capacity})`
        });
        
        if (isComplete) {
          console.log(`   ✅ Pallet is now COMPLETE! Payment notifications triggered.`);
        } else {
          console.log(`   ⏳ Pallet not full yet (${totalBottles}/${pallet.bottle_capacity})`);
        }
      } catch (error) {
        console.error(`Error checking pallet ${pallet.id}:`, error);
        results.push({
          palletId: pallet.id,
          palletName: pallet.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pallet completion check completed",
      results
    });

  } catch (error) {
    console.error("Error in check-completion:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Support both GET and POST requests
export async function GET() {
  return checkAllPallets();
}

export async function POST() {
  return checkAllPallets();
}

