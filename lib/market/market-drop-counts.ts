import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";

/**
 * Sum bottle quantities on reservations linked to this market_drop (in-fill statuses).
 * Source of truth is `order_reservation_items`, not cached `market_drops.reserved_bottles`.
 */
export async function sumFillBottlesOnMarketDrop(
  marketDropId: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data: reservations, error } = await sb
    .from("order_reservations")
    .select("id")
    .eq("market_drop_id", marketDropId)
    .in("status", [...PALLET_FILL_STATUSES]);

  if (error || !reservations?.length) {
    if (error) {
      console.error("[sumFillBottlesOnMarketDrop] reservations:", error.message);
    }
    return 0;
  }

  const ids = reservations
    .map((r) => (r as { id?: string }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (ids.length === 0) return 0;

  const { data: items, error: itemsError } = await sb
    .from("order_reservation_items")
    .select("quantity")
    .in("reservation_id", ids);

  if (itemsError || !items?.length) {
    return 0;
  }

  return items.reduce(
    (sum, row) => sum + (Number((row as { quantity?: unknown }).quantity) || 0),
    0,
  );
}

/** Conditional / SetupIntent-path demand (same fill statuses, conditional flag). */
export async function sumRequestedBottlesOnMarketDrop(
  marketDropId: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data: reservations, error } = await sb
    .from("order_reservations")
    .select("id")
    .eq("market_drop_id", marketDropId)
    .in("status", [...PALLET_FILL_STATUSES])
    .eq("is_conditional", true);

  if (error || !reservations?.length) return 0;

  const ids = reservations
    .map((r) => (r as { id?: string }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (ids.length === 0) return 0;

  const { data: items } = await sb
    .from("order_reservation_items")
    .select("quantity")
    .in("reservation_id", ids);

  if (!items?.length) return 0;

  return items.reduce(
    (sum, row) => sum + (Number((row as { quantity?: unknown }).quantity) || 0),
    0,
  );
}

/** EU-style non-conditional reservations on this drop. */
export async function sumChargeableBottlesOnMarketDrop(
  marketDropId: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data: reservations, error } = await sb
    .from("order_reservations")
    .select("id, is_conditional")
    .eq("market_drop_id", marketDropId)
    .in("status", [...PALLET_FILL_STATUSES]);

  if (error || !reservations?.length) return 0;

  const ids = reservations
    .filter(
      (r) =>
        (r as { is_conditional?: boolean | null }).is_conditional !== true,
    )
    .map((r) => (r as { id?: string }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (ids.length === 0) return 0;

  const { data: items } = await sb
    .from("order_reservation_items")
    .select("quantity")
    .in("reservation_id", ids);

  if (!items?.length) return 0;

  return items.reduce(
    (sum, row) => sum + (Number((row as { quantity?: unknown }).quantity) || 0),
    0,
  );
}

export type MarketDropBottleBreakdown = {
  totalFillBottles: number;
  requestedBottles: number;
  chargeableBottles: number;
};

export async function getMarketDropBottleBreakdown(
  marketDropId: string,
): Promise<MarketDropBottleBreakdown> {
  const [totalFill, requested, chargeable] = await Promise.all([
    sumFillBottlesOnMarketDrop(marketDropId),
    sumRequestedBottlesOnMarketDrop(marketDropId),
    sumChargeableBottlesOnMarketDrop(marketDropId),
  ]);
  return {
    totalFillBottles: totalFill,
    requestedBottles: requested,
    chargeableBottles: chargeable,
  };
}
