import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  checkPalletCompletion,
  syncPalletShipReadiness,
} from "@/lib/pallet-completion";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import { resolveMinBottlesToShip, isPalletShippingLocked } from "@/lib/pallet-ship-progress";

async function checkAllPallets(shouldFix = false) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: pallets, error: palletsError } = await supabase
      .from("pallets")
      .select(
        "id, name, bottle_capacity, min_bottles_to_complete, status, is_complete",
      );

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
        const minToShip = resolveMinBottlesToShip(
          (pallet as { min_bottles_to_complete?: number }).min_bottles_to_complete,
        );
        console.log(`\n🔍 Checking pallet: ${pallet.name} (${pallet.id})`);
        console.log(
          `   Ship threshold: ${minToShip} (physical ${pallet.bottle_capacity})`,
        );

        const totalBottles = await sumReservedBottlesOnPallet(pallet.id);
        console.log(`   Total Reserved: ${totalBottles} bottles`);

        if (pallet.is_complete) {
          console.log(`   ℹ️ Pallet already marked as complete`);

          const locked = isPalletShippingLocked(pallet.status);
          const isIncorrectlyComplete =
            !locked && totalBottles < minToShip;

          if (isIncorrectlyComplete && shouldFix) {
            console.log(
              `   🔧 Syncing incorrectly ready pallet (${totalBottles}/${minToShip})`,
            );
            await syncPalletShipReadiness(pallet.id);
          } else if (isIncorrectlyComplete) {
            await syncPalletShipReadiness(pallet.id);
          }

          results.push({
            palletId: pallet.id,
            palletName: pallet.name,
            capacity: pallet.bottle_capacity,
            minBottlesToShip: minToShip,
            reserved: totalBottles,
            wasCompleted: false,
            alreadyComplete: true,
            wasFixed: isIncorrectlyComplete,
            status: isIncorrectlyComplete
              ? `🔧 Fixed - Was Incorrectly Ready (${totalBottles}/${minToShip})`
              : `✅ Already Ready (${totalBottles}/${minToShip})`,
          });
        } else {
          const isComplete = await checkPalletCompletion(pallet.id);

          results.push({
            palletId: pallet.id,
            palletName: pallet.name,
            capacity: pallet.bottle_capacity,
            minBottlesToShip: minToShip,
            reserved: totalBottles,
            wasCompleted: isComplete,
            alreadyComplete: false,
            status: isComplete
              ? "✅ READY TO SHIP"
              : `⏳ Not ready yet (${totalBottles}/${minToShip})`,
          });
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

    return NextResponse.json({ results });
  } catch (error) {
    console.error("checkAllPallets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return checkAllPallets(false);
}

export async function POST() {
  return checkAllPallets(true);
}
