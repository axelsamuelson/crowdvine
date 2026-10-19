import type { SupabaseClient } from "@supabase/supabase-js";
import { b2bPalletStatusSchema } from "@/lib/b2b/pallet-status";

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

export function shipmentIdsFromItems(
  items: Pick<B2BPalletShipmentItemRow, "shipment_id">[],
): string[] {
  return [
    ...new Set(
      items
        .map((row) => row.shipment_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
}

/**
 * Full-pallet bottle counts for the given shipment ids.
 * Required when `items` are filtered to a subset of wines — otherwise shipping
 * is divided by too few bottles (PDP showed ~133 SEK/bottle instead of ~6).
 */
export async function fetchTotalBottlesByShipmentIds(
  sb: SupabaseClient,
  shipmentIds: readonly string[],
): Promise<Map<string, number>> {
  const ids = [...new Set(shipmentIds.filter((id) => id.length > 0))];
  if (ids.length === 0) return new Map();

  const { data, error } = await sb
    .from("b2b_pallet_shipment_items")
    .select("shipment_id, quantity")
    .in("shipment_id", ids);

  if (error || !Array.isArray(data)) return new Map();
  return buildTotalBottlesByShipment(data);
}

export function aggregateB2BPalletStock(
  items: B2BPalletShipmentItemRow[],
  options?: {
    sellableOnly?: boolean;
    /**
     * Full pallet bottle counts keyed by shipment id.
     * When omitted, totals are derived from `items` only (wrong if items are
     * wine-filtered — pass {@link fetchTotalBottlesByShipmentIds} result).
     */
    totalBottlesByShipment?: Map<string, number>;
  },
): { stockMap: Map<string, number>; shippingMap: Map<string, number> } {
  const sellableOnly = options?.sellableOnly ?? true;
  const stockMap = new Map<string, number>();
  const shippingMap = new Map<string, number>();

  const eligible = sellableOnly
    ? items.filter((row) => isB2BPalletSellable(row.b2b_pallet_shipments))
    : items;

  const totalBottlesByShipment =
    options?.totalBottlesByShipment ?? buildTotalBottlesByShipment(eligible);
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

/** Aggregate stock/shipping using full-pallet bottle counts (safe for wine-filtered queries). */
export async function aggregateB2BPalletStockWithFullPalletTotals(
  sb: SupabaseClient,
  items: B2BPalletShipmentItemRow[],
  options?: { sellableOnly?: boolean },
): Promise<{ stockMap: Map<string, number>; shippingMap: Map<string, number> }> {
  const sellableOnly = options?.sellableOnly ?? true;
  const eligible = sellableOnly
    ? items.filter((row) => isB2BPalletSellable(row.b2b_pallet_shipments))
    : items;
  const totalBottlesByShipment = await fetchTotalBottlesByShipmentIds(
    sb,
    shipmentIdsFromItems(eligible),
  );
  return aggregateB2BPalletStock(items, {
    sellableOnly,
    totalBottlesByShipment,
  });
}

export const B2B_WINE_AVAILABILITIES = [
  "in_stock",
  "incoming",
  "out_of_stock",
  "hidden",
] as const;

export type B2BWineAvailability = (typeof B2B_WINE_AVAILABILITIES)[number];

type PalletPresence = {
  inTransit: Set<string>;
  active: Set<string>;
};

function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function readPalletStockRow(row: unknown): B2BPalletShipmentItemRow | null {
  if (typeof row !== "object" || row === null) return null;
  const wineId = "wine_id" in row && typeof row.wine_id === "string" ? row.wine_id : undefined;
  const shipmentId =
    "shipment_id" in row && typeof row.shipment_id === "string" ? row.shipment_id : undefined;
  const shipmentRaw = "b2b_pallet_shipments" in row ? row.b2b_pallet_shipments : null;
  const shipmentSource = Array.isArray(shipmentRaw) ? shipmentRaw[0] : shipmentRaw;
  let shipment: B2BPalletShipmentEmbed | null = null;
  if (typeof shipmentSource === "object" && shipmentSource !== null) {
    shipment = {
      cost_cents:
        "cost_cents" in shipmentSource ? readOptionalNumber(shipmentSource.cost_cents) ?? null : null,
      is_active:
        "is_active" in shipmentSource && typeof shipmentSource.is_active === "boolean"
          ? shipmentSource.is_active
          : null,
    };
  }
  return {
    wine_id: wineId,
    quantity: "quantity" in row ? readOptionalNumber(row.quantity) : undefined,
    quantity_sold: "quantity_sold" in row ? readOptionalNumber(row.quantity_sold) : undefined,
    shipment_id: shipmentId,
    b2b_pallet_shipments: shipment,
  };
}

function readWineId(row: unknown): string | null {
  if (typeof row !== "object" || row === null || !("wine_id" in row)) return null;
  const wineId = row.wine_id;
  return typeof wineId === "string" && wineId.length > 0 ? wineId : null;
}

function readShipmentStatus(row: unknown): string | null {
  if (typeof row !== "object" || row === null || !("b2b_pallet_shipments" in row)) {
    return null;
  }
  const shipment = row.b2b_pallet_shipments;
  const source = Array.isArray(shipment) ? shipment[0] : shipment;
  if (typeof source !== "object" || source === null || !("status" in source)) return null;
  return typeof source.status === "string" ? source.status : null;
}

/**
 * First match wins:
 * sellable stock > 0, then an in_transit pallet, then an active pallet, else hidden.
 * `sellableStockByWineId` is the existing sellable-stock figure (active pallets,
 * with the wines.b2b_stock fallback). This does not recalculate it.
 * One query for the whole id list.
 */
export async function fetchB2BWineAvailability(
  sb: SupabaseClient,
  wineIds: readonly string[],
  sellableStockByWineId: ReadonlyMap<string, number | null | undefined>,
): Promise<Map<string, B2BWineAvailability>> {
  const ids = [...new Set(wineIds.filter((id) => id.length > 0))];
  const presence = await fetchB2BPalletPresence(sb, ids);
  const availability = new Map<string, B2BWineAvailability>();

  for (const id of ids) {
    const stock = sellableStockByWineId.get(id);
    if (typeof stock === "number" && stock > 0) {
      availability.set(id, "in_stock");
    } else if (presence.inTransit.has(id)) {
      availability.set(id, "incoming");
    } else if (presence.active.has(id)) {
      availability.set(id, "out_of_stock");
    } else {
      availability.set(id, "hidden");
    }
  }

  return availability;
}

/**
 * Same sellable figure the shop uses: active-pallet remaining, then wines.b2b_stock.
 * Used by list endpoints that do not already have that map.
 */
export async function fetchResolvedSellableB2BStock(
  sb: SupabaseClient,
  wineIds: readonly string[],
): Promise<Map<string, number | null>> {
  const ids = [...new Set(wineIds.filter((id) => id.length > 0))];
  const resolved = new Map<string, number | null>();
  if (ids.length === 0) return resolved;

  const { data: stockRowsRaw, error } = await sb
    .from("b2b_pallet_shipment_items")
    .select(B2B_PALLET_ITEM_STOCK_SELECT)
    .in("wine_id", ids)
    .eq("b2b_pallet_shipments.is_active", true);

  const stockRows = !error && Array.isArray(stockRowsRaw)
    ? stockRowsRaw.flatMap((row) => {
        const parsed = readPalletStockRow(row);
        return parsed ? [parsed] : [];
      })
    : [];
  const { stockMap } = aggregateB2BPalletStock(stockRows, { sellableOnly: true });
  const columnStock = new Map<string, number | null>();
  const { data: columnRows } = await sb.from("wines").select("id, b2b_stock").in("id", ids);
  if (Array.isArray(columnRows)) {
    for (const row of columnRows) {
      if (typeof row !== "object" || row === null || !("id" in row)) continue;
      const id = row.id;
      if (typeof id !== "string" || id.length === 0) continue;
      const raw = "b2b_stock" in row ? row.b2b_stock : null;
      columnStock.set(
        id,
        raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null,
      );
    }
  }

  for (const id of ids) {
    const fromPallets = stockMap.get(id);
    resolved.set(
      id,
      fromPallets != null ? fromPallets : (columnStock.get(id) ?? null),
    );
  }
  return resolved;
}

/** Ids that must not appear in a dirtywine.se wine list. */
export async function fetchHiddenB2BWineIds(
  sb: SupabaseClient,
  wineIds: readonly string[],
): Promise<Set<string>> {
  const stock = await fetchResolvedSellableB2BStock(sb, wineIds);
  const availability = await fetchB2BWineAvailability(sb, wineIds, stock);
  const hidden = new Set<string>();
  for (const [id, status] of availability) {
    if (status === "hidden") hidden.add(id);
  }
  return hidden;
}

async function fetchB2BPalletPresence(
  sb: SupabaseClient,
  wineIds: readonly string[],
): Promise<PalletPresence> {
  const empty: PalletPresence = { inTransit: new Set(), active: new Set() };
  if (wineIds.length === 0) return empty;

  const { data, error } = await sb
    .from("b2b_pallet_shipment_items")
    .select("wine_id, b2b_pallet_shipments!inner(status)")
    .in("wine_id", wineIds)
    .in("b2b_pallet_shipments.status", ["in_transit", "active"]);

  if (error || !Array.isArray(data)) return empty;

  const inTransit = new Set<string>();
  const active = new Set<string>();
  for (const row of data) {
    const wineId = readWineId(row);
    const parsed = b2bPalletStatusSchema.safeParse(readShipmentStatus(row));
    if (!wineId || !parsed.success) continue;
    if (parsed.data === "in_transit") inTransit.add(wineId);
    if (parsed.data === "active") active.add(wineId);
  }

  return { inTransit, active };
}

/**
 * Wine ids that sit on at least one Dirty Wine pallet marked `is_new`.
 * Used for the NEW badge on dirtywine.se.
 */
export async function fetchB2BWineIsNew(
  sb: SupabaseClient,
  wineIds: readonly string[],
): Promise<Set<string>> {
  const result = new Set<string>();
  if (wineIds.length === 0) return result;

  try {
    const { data, error } = await sb
      .from("b2b_pallet_shipment_items")
      .select("wine_id, b2b_pallet_shipments!inner(is_new)")
      .in("wine_id", wineIds)
      .eq("b2b_pallet_shipments.is_new", true);

    if (error || !Array.isArray(data)) return result;

    for (const row of data) {
      const wineId = readWineId(row);
      if (wineId) result.add(wineId);
    }
  } catch {
    /* is_new column may not exist yet */
  }

  return result;
}
