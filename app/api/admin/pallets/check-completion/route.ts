import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkPalletCompletion } from "@/lib/pallet-completion";

async function checkAllPallets(shouldFix = false) {
  try {
    const supabase = getSupabaseAdmin();

    // Get all pallets (including already complete ones for manual re-check)
    const { data: pallets, error: palletsError } = await supabase
      .from("pallets")
      .select("id, name, bottle_capacity, status, is_complete");

    if (palletsError) {
      console.error("Error fetching pallets:", palletsError);
      return NextResponse.json(
        { error: "Failed to fetch pallets" },
        { status: 500 },
      );
    }

    const results = [];

    for (const pallet of pallets || []) {
      try {
        console.log(`\n🔍 Checking pallet: ${pallet.name} (${pallet.id})`);
        console.log(`   Capacity: ${pallet.bottle_capacity} bottles`);

        // Count reserved bottles for this pallet from order_reservation_items
        const { data: reservations } = await supabase
          .from("order_reservations")
          .select("id, status")
          .eq("pallet_id", pallet.id)
          .in("status", ["placed", "approved", "partly_approved", "pending_payment", "confirmed"]);

        // Count bottles from order_reservation_items
        let totalBottles = 0;
        for (const reservation of reservations || []) {
          const { data: items } = await supabase
            .from("order_reservation_items")
            .select("quantity")
            .eq("reservation_id", reservation.id);

          const reservationBottles =
            items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          totalBottles += reservationBottles;
          console.log(
            `   Reservation ${reservation.id}: ${reservationBottles} bottles (${reservation.status})`,
          );
        }

        console.log(`   Total Reserved: ${totalBottles} bottles`);

        // Check if already complete
        if (pallet.is_complete) {
          console.log(`   ℹ️ Pallet already marked as complete`);

          // Check if it's incorrectly marked as complete (not actually full)
          const isIncorrectlyComplete = totalBottles < pallet.bottle_capacity;

          if (isIncorrectlyComplete) {
            console.log(
              `   🔧 Fixing incorrectly marked complete pallet (${totalBottles}/${pallet.bottle_capacity})`,
            );

            // Fix the pallet
            const { error: updateError } = await supabase
              .from("pallets")
              .update({
                is_complete: false,
                status: "OPEN",
                completed_at: null,
                payment_deadline: null,
              })
              .eq("id", pallet.id);

            if (updateError) {
              console.error(`   ❌ Error fixing pallet:`, updateError);
            } else {
              console.log(`   ✅ Pallet fixed - marked as OPEN`);

              // Fix reservations
              await supabase
                .from("order_reservations")
                .update({
                  status: "placed",
                  payment_status: null,
                  payment_deadline: null,
                })
                .eq("pallet_id", pallet.id)
                .in("status", ["pending_payment"]);

              console.log(`   ✅ Reservations fixed - marked as placed`);
            }
          }

          results.push({
            palletId: pallet.id,
            palletName: pallet.name,
            capacity: pallet.bottle_capacity,
            reserved: totalBottles,
            wasCompleted: false,
            alreadyComplete: true,
            wasFixed: isIncorrectlyComplete,
            status: isIncorrectlyComplete
              ? `🔧 Fixed - Was Incorrectly Complete (${totalBottles}/${pallet.bottle_capacity})`
              : `✅ Already Complete (${totalBottles}/${pallet.bottle_capacity})`,
          });
        } else {
          const isComplete = await checkPalletCompletion(pallet.id);

          results.push({
            palletId: pallet.id,
            palletName: pallet.name,
            capacity: pallet.bottle_capacity,
            reserved: totalBottles,
            wasCompleted: isComplete,
            alreadyComplete: false,
            status: isComplete
              ? "✅ COMPLETED - Payment emails sent!"
              : `⏳ Not full yet (${totalBottles}/${pallet.bottle_capacity})`,
          });

          if (isComplete) {
            console.log(
              `   ✅ Pallet is now COMPLETE! Payment notifications triggered.`,
            );
          } else {
            console.log(
              `   ⏳ Pallet not full yet (${totalBottles}/${pallet.bottle_capacity})`,
            );
          }
        }
      } catch (error) {
        console.error(`Error checking pallet ${pallet.id}:`, error);
        results.push({
          palletId: pallet.id,
          palletName: pallet.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pallet completion check completed",
      results,
    });
  } catch (error) {
    console.error("Error in check-completion:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Support both GET and POST requests
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldFix = searchParams.get("fix") === "true";
  return checkAllPallets(shouldFix);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shouldFix = body.fix === true;
    return checkAllPallets(shouldFix);
  } catch {
    return checkAllPallets(false);
  }
}
