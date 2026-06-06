export type B2BPalletShipmentEmbed = {
  id?: string;
  name?: string;
  created_at?: string;
  cost_cents?: number | null;
  is_active?: boolean | null;
};

export type B2BPalletShipmentItemRow = {
  wine_id?: string;
  quantity?: number;
  quantity_sold?: number;
  shipment_id?: string;
  b2b_pallet_shipments?: B2BPalletShipmentEmbed | null;
};

export const B2B_PALLET_ITEM_STOCK_SELECT =
  "wine_id, quantity, quantity_sold, shipment_id, b2b_pallet_shipments!inner(cost_cents, is_active)";

/** Pallet wine counts toward B2B sellable stock when the pallet is active. */
export function isB2BPalletSellable(
  shipment: B2BPalletShipmentEmbed | null | undefined,
): boolean {
  return shipment?.is_active === true;
}

export function itemRemaining(
  row: Pick<B2BPalletShipmentItemRow, "quantity" | "quantity_sold">,
): number {
  return Math.max(0, (row.quantity ?? 0) - (row.quantity_sold ?? 0));
}

export function buildTotalBottlesByShipment(
  items: Pick<B2BPalletShipmentItemRow, "shipment_id" | "quantity">[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of items) {
    const sid = row.shipment_id;
    if (!sid) continue;
    map.set(sid, (map.get(sid) ?? 0) + (row.quantity ?? 0));
  }
  return map;
}

export function aggregateB2BPalletStock(
  items: B2BPalletShipmentItemRow[],
  options?: { sellableOnly?: boolean },
): { stockMap: Map<string, number>; shippingMap: Map<string, number> } {
  const sellableOnly = options?.sellableOnly ?? true;
  const stockMap = new Map<string, number>();
  const shippingMap = new Map<string, number>();

  const eligible = sellableOnly
    ? items.filter((row) => isB2BPalletSellable(row.b2b_pallet_shipments))
    : items;

  const totalBottlesByShipment = buildTotalBottlesByShipment(eligible);
  const byWine = new Map<string, { remaining: number; shippingSum: number }>();

  for (const row of eligible) {
    const remaining = itemRemaining(row);
    const wid = row.wine_id;
    if (!wid) continue;

    const costCents = row.b2b_pallet_shipments?.cost_cents ?? 0;
    const totalBottles = totalBottlesByShipment.get(row.shipment_id ?? "") ?? 1;
    const shippingPerBottle =
      totalBottles > 0 ? costCents / 100 / totalBottles : 0;

    const curr = byWine.get(wid) ?? { remaining: 0, shippingSum: 0 };
    curr.remaining += remaining;
    curr.shippingSum += shippingPerBottle * remaining;
    byWine.set(wid, curr);
    stockMap.set(wid, (stockMap.get(wid) ?? 0) + remaining);
  }

  byWine.forEach((v, wid) => {
    if (v.remaining > 0) {
      shippingMap.set(wid, v.shippingSum / v.remaining);
    }
  });

  return { stockMap, shippingMap };
}
