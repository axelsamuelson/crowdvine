import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncPalletShipReadiness } from "@/lib/pallet-completion";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import {
  computePalletShipProgress,
  resolveMinBottlesToShip,
  resolvePhysicalBottleCapacity,
} from "@/lib/pallet-ship-progress";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PalletStateRow = {
  id: string;
  name: string | null;
  bottle_capacity: number | null;
  min_bottles_to_complete: number | null;
  is_complete: boolean | null;
  status: string | null;
};

async function loadPalletState(palletId: string): Promise<PalletStateRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("pallets")
    .select(
      "id, name, bottle_capacity, min_bottles_to_complete, is_complete, status",
    )
    .eq("id", palletId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PalletStateRow;
}

async function snapshotForResponse(pallet: PalletStateRow) {
  const bottlesFilled = await sumReservedBottlesOnPallet(pallet.id);
  const physicalBottleCapacity = resolvePhysicalBottleCapacity(
    pallet.bottle_capacity,
  );
  const minBottlesToShip = resolveMinBottlesToShip(
    pallet.min_bottles_to_complete,
  );
  const progress = computePalletShipProgress(
    bottlesFilled,
    minBottlesToShip,
    physicalBottleCapacity,
  );

  return {
    id: pallet.id,
    name: pallet.name,
    status: pallet.status,
    is_complete: Boolean(pallet.is_complete),
    bottlesFilled: progress.bottlesFilled,
    physicalBottleCapacity: progress.physicalBottleCapacity,
    minBottlesToShip: progress.minBottlesToShip,
    bottlesRemainingToShip: progress.bottlesRemainingToShip,
    shipProgressPercent: progress.shipProgressPercent,
    isReadyToShip: progress.isReadyToShip,
  };
}

/**
 * Recalculate ship-readiness for a pallet from live reservation fill and sync DB state.
 * Body: `{ "palletId": "<uuid>" }`
 *
 * Delegates to {@link syncPalletShipReadiness} — does not use bottle_capacity as a readiness threshold.
 * Reservation status soft-revert (clear payment_deadline only) is handled inside that sync; this route
 * does not force pending_payment → placed.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const palletIdRaw =
      body &&
      typeof body === "object" &&
      body !== null &&
      "palletId" in body
        ? (body as { palletId?: unknown }).palletId
        : null;
    const palletId =
      typeof palletIdRaw === "string" ? palletIdRaw.trim() : "";

    if (!palletId || !UUID_RE.test(palletId)) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid palletId. Pass JSON body: { \"palletId\": \"<uuid>\" }",
        },
        { status: 400 },
      );
    }

    const beforeRow = await loadPalletState(palletId);
    if (!beforeRow) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    const previousState = await snapshotForResponse(beforeRow);
    const sync = await syncPalletShipReadiness(palletId);
    const afterRow = await loadPalletState(palletId);
    if (!afterRow) {
      return NextResponse.json(
        { error: "Pallet disappeared after sync" },
        { status: 500 },
      );
    }
    const newState = await snapshotForResponse(afterRow);

    return NextResponse.json({
      success: true,
      palletId,
      bottlesFilled: newState.bottlesFilled,
      physicalBottleCapacity: newState.physicalBottleCapacity,
      minBottlesToShip: newState.minBottlesToShip,
      isReadyToShip: newState.isReadyToShip,
      previousState,
      newState,
      sync: {
        becameReady: sync.becameReady,
        reverted: sync.reverted,
        isReady: sync.isReady,
      },
      message: sync.reverted
        ? "Pallet readiness reverted (fill below min_bottles_to_complete)"
        : sync.becameReady
          ? "Pallet marked ready to ship"
          : sync.isReady
            ? "Pallet already ship-ready; no change"
            : "Pallet not ship-ready; no change",
    });
  } catch (error) {
    console.error("❌ [Fix Pallet Completion] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
