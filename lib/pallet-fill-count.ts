import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  deliveryEstimateLabelFromFillPercent,
  type PalletEstimatedDeliveryBand,
} from "@/lib/pallet-delivery-estimate-label";
import {
  DEFAULT_MIN_BOTTLES_TO_COMPLETE,
  computePalletShipProgress,
  resolveMinBottlesToShip,
  resolvePhysicalBottleCapacity,
  type PalletShipProgress,
} from "@/lib/pallet-ship-progress";

export type { PalletEstimatedDeliveryBand };
export { deliveryEstimateLabelFromFillPercent };
export type { PalletShipProgress };

/** @deprecated Prefer shipProgressPercent from computePalletShipProgress for UI. */
export function computePalletFillPercentForDisplay(
  bottlesFilled: number,
  bottleCapacity: number,
): number {
  if (bottleCapacity <= 0) return 0;
  return (
    Math.round(Math.min(100, (bottlesFilled / bottleCapacity) * 100) * 10) / 10
  );
}

/** Single source of truth for which reservation statuses count toward pallet fill. */
export const PALLET_FILL_STATUSES = [
  "pending_producer_approval",
  "conditional_pending",
  "placed",
  "approved",
  "partly_approved",
  "pending_payment",
  "confirmed",
] as const;

/** @deprecated Use PALLET_FILL_STATUSES — kept for existing re-exports. */
export const ORDER_RESERVATION_STATUSES_FOR_PALLET_FILL = PALLET_FILL_STATUSES;

/**
 * Sum `order_reservation_items.quantity` for reservations on this pallet
 * with status in {@link PALLET_FILL_STATUSES}. No MOQ.
 */
export async function sumReservedBottlesOnPallet(
  palletId: string,
): Promise<number> {
  const sb = getSupabaseAdmin();

  const { data: reservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", palletId)
    .in("status", [...PALLET_FILL_STATUSES]);

  if (reservationsError || !reservations?.length) {
    return 0;
  }

  const reservationIds = reservations
    .map((r) => r.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const { data: items, error: itemsError } = await sb
    .from("order_reservation_items")
    .select("quantity")
    .in("reservation_id", reservationIds);

  if (itemsError || !items?.length) {
    return 0;
  }

  return items.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0,
  );
}

export async function getPalletFillData(
  palletId: string,
  bottleCapacity: number,
  minBottlesToComplete?: number,
): Promise<{
  bottlesFilled: number;
  bottleCapacity: number;
  minBottlesToShip: number;
  fillPercent: number;
  shipProgress: PalletShipProgress;
  estimatedDelivery: PalletEstimatedDeliveryBand;
}> {
  const bottlesFilled = await sumReservedBottlesOnPallet(palletId);
  const physical = resolvePhysicalBottleCapacity(bottleCapacity);
  const minToShip = resolveMinBottlesToShip(
    minBottlesToComplete ?? DEFAULT_MIN_BOTTLES_TO_COMPLETE,
  );
  const shipProgress = computePalletShipProgress(
    bottlesFilled,
    minToShip,
    physical,
  );

  return {
    bottlesFilled,
    bottleCapacity: physical,
    minBottlesToShip: shipProgress.minBottlesToShip,
    /** Ship-ready progress % (toward min), not physical fill. */
    fillPercent: shipProgress.shipProgressPercent,
    shipProgress,
    estimatedDelivery: deliveryEstimateLabelFromFillPercent(
      shipProgress.shipProgressPercent,
    ),
  };
}
