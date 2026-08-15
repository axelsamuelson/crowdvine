import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  checkPalletCompletion,
  findStalePreShippingPalletReadiness,
  syncPalletShipReadiness,
} from "@/lib/pallet-completion";
import { sumReservedBottlesOnPalletResult } from "@/lib/pallet-fill-count";
import {
  derivePreShippingAutoStatus,
  resolveMinBottlesToShip,
  isPalletShippingLocked,
} from "@/lib/pallet-ship-progress";

async function checkAllPallets(shouldFix: boolean) {
  try {
    await requireAdmin();
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
          (pallet as { min_bottles_to_complete?: number })
            .min_bottles_to_complete,
        );
        const fillResult = await sumReservedBottlesOnPalletResult(pallet.id);
        if (!fillResult.ok) {
          results.push({
            palletId: pallet.id,
            palletName: pallet.name,
            error: fillResult.error,
            fillUnavailable: true,
          });
          continue;
        }
        const totalBottles = fillResult.bottles;
        const locked = isPalletShippingLocked(pallet.status);
        const canonicalReady = totalBottles >= minToShip;
        const persistedComplete = Boolean(pallet.is_complete);
        const expectedStatus = derivePreShippingAutoStatus({
          bottlesFilled: totalBottles,
          minBottlesToShip: minToShip,
        });
        const currentStatus = String(pallet.status || "").toLowerCase();
        const statusMismatch =
          !locked &&
          (currentStatus === "open" ||
            currentStatus === "consolidating" ||
            currentStatus === "complete" ||
            currentStatus === "") &&
          currentStatus !== expectedStatus;
        const isStale =
          !locked && persistedComplete !== canonicalReady;

        let wasFixed = false;
        let wasCompleted = false;

        if (shouldFix && !locked) {
          if (isStale || statusMismatch || (!persistedComplete && canonicalReady)) {
            if (persistedComplete && !canonicalReady) {
              await syncPalletShipReadiness(pallet.id);
              wasFixed = true;
            } else if (!persistedComplete && canonicalReady) {
              wasCompleted = await checkPalletCompletion(pallet.id);
            } else if (statusMismatch) {
              await syncPalletShipReadiness(pallet.id);
              wasFixed = true;
            }
          }
        }

        results.push({
          palletId: pallet.id,
          palletName: pallet.name,
          capacity: pallet.bottle_capacity,
          minBottlesToShip: minToShip,
          reserved: totalBottles,
          persistedIsComplete: persistedComplete,
          canonicalIsReady: canonicalReady,
          shippingLocked: locked,
          stale: isStale,
          wasCompleted,
          wasFixed: shouldFix ? wasFixed : false,
          status: locked
            ? `🔒 Shipping-locked (${pallet.status})`
            : isStale
              ? shouldFix && wasFixed
                ? `🔧 Fixed stale readiness (${totalBottles}/${minToShip})`
                : `⚠️ Stale readiness persisted=${persistedComplete} canonical=${canonicalReady} (${totalBottles}/${minToShip})`
              : statusMismatch
                ? shouldFix && wasFixed
                  ? `🔧 Fixed status ${currentStatus} → ${expectedStatus}`
                  : `⚠️ Status mismatch ${currentStatus} vs expected ${expectedStatus}`
                : canonicalReady
                  ? "✅ Ready to ship"
                  : `⏳ Not ready (${totalBottles}/${minToShip})`,
          expectedStatus,
          statusMismatch,
        });
      } catch (error) {
        console.error(`Error checking pallet ${pallet.id}:`, error);
        results.push({
          palletId: pallet.id,
          palletName: pallet.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const staleRows = shouldFix
      ? []
      : await findStalePreShippingPalletReadiness();

    return NextResponse.json({
      results,
      staleCount: results.filter((r) => (r as { stale?: boolean }).stale).length,
      stale: staleRows,
      mutated: shouldFix,
    });
  } catch (error) {
    console.error("checkAllPallets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Read-only diagnostic — does not mutate production rows. */
export async function GET() {
  return checkAllPallets(false);
}

/** Explicit repair pass — mutates via syncPalletShipReadiness only. */
export async function POST() {
  return checkAllPallets(true);
}
