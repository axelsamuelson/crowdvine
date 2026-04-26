import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  deliveryEstimateLabelFromFillPercent,
  type PalletEstimatedDeliveryBand,
} from "@/lib/pallet-delivery-estimate-label";

export type { PalletEstimatedDeliveryBand };
export { deliveryEstimateLabelFromFillPercent };

/** Same rounding as legacy zone-status / PDP (one decimal, capped at 100). */
export function computePalletFillPercentForDisplay(
  bottlesFilled: number,
  bottleCapacity: number,
): number {
  if (bottleCapacity <= 0) return 0;
  return (
    Math.round(Math.min(100, (bottlesFilled / bottleCapacity) * 1000)) / 10
  );
}

/** Single source of truth for which reservation statuses count toward pallet fill. */
export const PALLET_FILL_STATUSES = [
  "pending_producer_approval",
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
): Promise<{
  bottlesFilled: number;
  bottleCapacity: number;
  fillPercent: number;
  estimatedDelivery: PalletEstimatedDeliveryBand;
}> {
  const bottlesFilled = await sumReservedBottlesOnPallet(palletId);
  const cap = Number.isFinite(bottleCapacity) && bottleCapacity > 0
    ? bottleCapacity
    : 0;
  const fillPercent = computePalletFillPercentForDisplay(bottlesFilled, cap);
  return {
    bottlesFilled,
    bottleCapacity: cap,
    fillPercent,
    estimatedDelivery: deliveryEstimateLabelFromFillPercent(fillPercent),
  };
}
