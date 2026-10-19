import type { SupabaseClient } from "@supabase/supabase-js";

export type PalletShippedAtRow = {
  wine_id?: string | null;
  b2b_pallet_shipments?:
    | { shipped_at?: string | null }
    | { shipped_at?: string | null }[]
    | null;
};

/** Milliseconds since epoch, or null when the wine has no shipped pallet. */
export type PalletShippedAtByWineId = Map<string, number | null>;

function readShippedAt(
  shipment:
    | { shipped_at?: string | null }
    | { shipped_at?: string | null }[]
    | null
    | undefined,
): number | null {
  const source = Array.isArray(shipment) ? shipment[0] : shipment;
  const raw = source?.shipped_at;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Latest `shipped_at` per wine among pallet rows that include that wine.
 * Wines with only null shipped dates stay null.
 */
export function buildLatestPalletShippedAtByWineId(
  rows: readonly PalletShippedAtRow[],
): PalletShippedAtByWineId {
  const map: PalletShippedAtByWineId = new Map();

  for (const row of rows) {
    const wineId = typeof row.wine_id === "string" ? row.wine_id : "";
    if (!wineId) continue;
    const shippedMs = readShippedAt(row.b2b_pallet_shipments);
    if (shippedMs == null) continue;

    const prev = map.get(wineId);
    if (prev == null || shippedMs > prev) {
      map.set(wineId, shippedMs);
    }
  }

  return map;
}

/**
 * Newest (reverse=true): later shipped_at first.
 * Oldest (reverse=false): earlier shipped_at first.
 * Wines never on a shipped pallet sort last in both directions.
 */
export function compareByPalletShippedAt(
  aWineId: string,
  bWineId: string,
  shippedAtByWineId: PalletShippedAtByWineId,
  reverse: boolean,
): number {
  const a = shippedAtByWineId.get(aWineId) ?? null;
  const b = shippedAtByWineId.get(bWineId) ?? null;

  if (a == null && b == null) {
    return aWineId.localeCompare(bWineId);
  }
  if (a == null) return 1;
  if (b == null) return -1;

  const cmp = a - b;
  if (cmp !== 0) return reverse ? -cmp : cmp;
  return aWineId.localeCompare(bWineId);
}

export function sortProductsByPalletShippedAt<T extends { id: string }>(
  products: readonly T[],
  shippedAtByWineId: PalletShippedAtByWineId,
  reverse: boolean,
): T[] {
  return [...products].sort((a, b) =>
    compareByPalletShippedAt(a.id, b.id, shippedAtByWineId, reverse),
  );
}

export function isCreatedAtShopSort(sortKey: string | undefined): boolean {
  return sortKey === "CREATED_AT" || sortKey === "CREATED";
}

/**
 * Dirty Wine Newest/Oldest: order by when the wine's pallet shipped
 * (max shipped_at among pallets that included the wine).
 */
export async function fetchLatestPalletShippedAtByWineId(
  sb: SupabaseClient,
  wineIds: readonly string[],
): Promise<PalletShippedAtByWineId> {
  if (wineIds.length === 0) return new Map();

  try {
    const { data, error } = await sb
      .from("b2b_pallet_shipment_items")
      .select("wine_id, b2b_pallet_shipments!inner(shipped_at)")
      .in("wine_id", wineIds)
      .not("b2b_pallet_shipments.shipped_at", "is", null);

    if (error) {
      console.error(
        "[b2b-pallet-shipped-sort] failed to load shipped_at:",
        error.message,
      );
      return new Map();
    }

    return buildLatestPalletShippedAtByWineId(data ?? []);
  } catch (e) {
    console.error("[b2b-pallet-shipped-sort] unexpected error:", e);
    return new Map();
  }
}

/** Apply pallet-shipped sort when on Dirty Wine + Newest/Oldest. */
export async function applyB2BPalletShippedSortIfNeeded<
  T extends { id: string },
>(
  products: readonly T[],
  options: {
    sb: SupabaseClient;
    isB2BSite: boolean;
    sortKey?: string;
    reverse?: boolean;
  },
): Promise<T[]> {
  const { sb, isB2BSite, sortKey, reverse = false } = options;
  if (!isB2BSite || !isCreatedAtShopSort(sortKey) || products.length <= 1) {
    return [...products];
  }

  const wineIds = products.map((p) => p.id).filter(Boolean);
  const shippedAtByWineId = await fetchLatestPalletShippedAtByWineId(
    sb,
    wineIds,
  );
  return sortProductsByPalletShippedAt(products, shippedAtByWineId, reverse);
}
