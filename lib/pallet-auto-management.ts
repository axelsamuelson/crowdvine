/**
 * TODO(markets): Consider `allowed_country_codes` (or `market_id`) on pallets / producers so
 * EU-only inventory cannot be reserved against unsupported destination countries at checkout.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import {
  namePalletForRoute,
  palletHasHistoryForCleanup,
} from "@/lib/pallet-hygiene";
import {
  DEFAULT_MIN_BOTTLES_TO_COMPLETE,
  DEFAULT_PHYSICAL_BOTTLE_CAPACITY,
  PALLET_ACCEPTING_STATUSES,
} from "@/lib/pallet-ship-progress";
import { PALLET_ZONE_PRIORITY_THRESHOLD } from "@/lib/pallet-pickup-suggestion";

export { PALLET_ZONE_PRIORITY_THRESHOLD };

/** Cart line shape used by checkout and Shopify cart mapping. */
export interface CartLine {
  merchandise: { id: string };
  quantity?: number;
}

export interface ResolveShippingRegionResult {
  shippingRegionId: string | null;
  producerIds: string[];
  hasMultipleRegions: boolean;
  regions: Array<{ regionId: string | null; producerIds: string[] }>;
}

const PG_UNIQUE_VIOLATION = "23505";

/**
 * When reserved bottles reach this fraction of *physical* bottle_capacity,
 * stop assigning to this pallet and create a new one.
 * Must NOT use min_bottles_to_complete — ship-ready pallets keep accepting until overflow or shipping_ordered.
 */
export const PALLET_OVERFLOW_THRESHOLD = 1.05;

const MAX_FIND_OR_CREATE_SPINS = 16;

/**
 * Groups cart lines by wine → producer → shipping_region.
 * shippingRegionId is set only when every producer in the cart has the same non-null region.
 * Producers without shipping_region_id force null (fallback to zone-pair pallet logic).
 */
export async function resolveShippingRegionForCart(
  cartLines: CartLine[],
): Promise<ResolveShippingRegionResult> {
  const sb = getSupabaseAdmin();
  const wineIds = [
    ...new Set(
      cartLines
        .map((l) => l.merchandise?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (wineIds.length === 0) {
    return {
      shippingRegionId: null,
      producerIds: [],
      hasMultipleRegions: false,
      regions: [],
    };
  }

  const { data: wines, error: winesError } = await sb
    .from("wines")
    .select("id, producer_id")
    .in("id", wineIds);

  if (winesError || !wines?.length) {
    console.error(
      "[resolveShippingRegionForCart] wines error:",
      winesError?.message,
    );
    return {
      shippingRegionId: null,
      producerIds: [],
      hasMultipleRegions: false,
      regions: [],
    };
  }

  const producerIds = [
    ...new Set(
      wines
        .map((w) => w.producer_id as string | null)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (producerIds.length === 0) {
    return {
      shippingRegionId: null,
      producerIds: [],
      hasMultipleRegions: false,
      regions: [],
    };
  }

  const { data: producers, error: prodError } = await sb
    .from("producers")
    .select("id, shipping_region_id")
    .in("id", producerIds);

  if (prodError || !producers?.length) {
    console.error(
      "[resolveShippingRegionForCart] producers error:",
      prodError?.message,
    );
    return {
      shippingRegionId: null,
      producerIds,
      hasMultipleRegions: false,
      regions: [],
    };
  }

  const byProducer = new Map<
    string,
    { shipping_region_id: string | null }
  >();
  for (const p of producers) {
    const id = p.id as string;
    const rid = p.shipping_region_id as string | null | undefined;
    byProducer.set(id, { shipping_region_id: rid ?? null });
  }

  const missingRegion = producerIds.some(
    (pid) => !byProducer.get(pid)?.shipping_region_id,
  );
  const distinctRegions = new Set<string>();
  for (const pid of producerIds) {
    const r = byProducer.get(pid)?.shipping_region_id;
    if (r) distinctRegions.add(r);
  }

  const hasMultipleRegions = distinctRegions.size > 1;

  const regionBuckets = new Map<string | null, string[]>();
  for (const pid of producerIds) {
    const rid = byProducer.get(pid)?.shipping_region_id ?? null;
    const list = regionBuckets.get(rid) ?? [];
    list.push(pid);
    regionBuckets.set(rid, list);
  }

  const regions = [...regionBuckets.entries()].map(([regionId, pids]) => ({
    regionId,
    producerIds: pids,
  }));

  if (missingRegion || hasMultipleRegions) {
    return {
      shippingRegionId: null,
      producerIds,
      hasMultipleRegions,
      regions,
    };
  }

  const single =
    distinctRegions.size === 1 ? [...distinctRegions][0]! : null;

  return {
    shippingRegionId: single,
    producerIds,
    hasMultipleRegions: false,
    regions,
  };
}

/**
 * Idempotent: repeated calls return the same open pallet row for (region, delivery).
 */
export async function findOrCreatePalletForRegion(
  shippingRegionId: string,
  deliveryZoneId: string,
): Promise<{ palletId: string; created: boolean }> {
  const sb = getSupabaseAdmin();

  try {
    const [{ data: regionRow, error: regionErr }, { data: zoneRow, error: zoneErr }] =
      await Promise.all([
        sb
          .from("shipping_regions")
          .select("name")
          .eq("id", shippingRegionId)
          .maybeSingle(),
        sb
          .from("pallet_zones")
          .select("name")
          .eq("id", deliveryZoneId)
          .maybeSingle(),
      ]);

    if (regionErr) {
      console.error("[findOrCreatePalletForRegion] region:", regionErr.message);
      throw regionErr;
    }
    if (zoneErr) {
      console.error("[findOrCreatePalletForRegion] zone:", zoneErr.message);
      throw zoneErr;
    }

    const regionName = String(regionRow?.name ?? "Region");
    const deliveryName = String(zoneRow?.name ?? "Delivery");

    for (let spin = 0; spin < MAX_FIND_OR_CREATE_SPINS; spin++) {
      // Accept open / consolidating / complete (ship-ready) so a pallet at the
      // min ship threshold keeps taking orders until physical overflow or admin
      // marks shipping_ordered. shipping_ordered is intentionally excluded so
      // new reservations open a fresh pallet.
      const { data: existingRows, error: findErr } = await sb
        .from("pallets")
        .select("id, bottle_capacity, status")
        .eq("shipping_region_id", shippingRegionId)
        .eq("delivery_zone_id", deliveryZoneId)
        .in("status", [...PALLET_ACCEPTING_STATUSES])
        .order("created_at", { ascending: false })
        .limit(8);

      if (findErr) {
        console.error("[findOrCreatePalletForRegion] select:", findErr.message);
        throw findErr;
      }

      const candidates = existingRows ?? [];
      let foundAssignable: string | null = null;
      let overflowFallback: string | null = null;

      for (const existing of candidates) {
        if (!existing?.id) continue;
        let bottles = 0;
        try {
          bottles = await sumReservedBottlesOnPallet(existing.id as string);
        } catch (e) {
          console.error("[findOrCreatePalletForRegion] sum bottles:", e);
          foundAssignable = existing.id as string;
          break;
        }

        const cap = Math.max(
          0,
          Math.floor(Number(existing.bottle_capacity) || 0),
        );
        const overflowCap = Math.floor(cap * PALLET_OVERFLOW_THRESHOLD);

        // Physical overflow only — never use min_bottles_to_complete here.
        if (cap > 0 && bottles >= overflowCap) {
          if (!overflowFallback) overflowFallback = existing.id as string;
          continue;
        }

        foundAssignable = existing.id as string;
        break;
      }

      if (foundAssignable) {
        return { palletId: foundAssignable, created: false };
      }

      const { count: priorCount, error: countErr } = await sb
        .from("pallets")
        .select("id", { count: "exact", head: true })
        .eq("shipping_region_id", shippingRegionId)
        .eq("delivery_zone_id", deliveryZoneId);

      if (countErr) {
        console.error(
          "[findOrCreatePalletForRegion] route count:",
          countErr.message,
        );
        throw countErr;
      }

      const name = namePalletForRoute(
        regionName,
        deliveryName,
        priorCount ?? 0,
      );

      const { data: inserted, error: insErr } = await sb
        .from("pallets")
        .insert({
          name,
          shipping_region_id: shippingRegionId,
          delivery_zone_id: deliveryZoneId,
          pickup_zone_id: null,
          bottle_capacity: DEFAULT_PHYSICAL_BOTTLE_CAPACITY,
          min_bottles_to_complete: DEFAULT_MIN_BOTTLES_TO_COMPLETE,
          cost_cents: 50000,
          status: "open",
          current_pickup_producer_id: null,
        })
        .select("id")
        .single();

      if (insErr) {
        if (insErr.code === PG_UNIQUE_VIOLATION) {
          // Unique index covers all accepting statuses: if another accepting
          // pallet exists (e.g. overflowed), reuse it rather than spinning forever.
          if (overflowFallback) {
            return { palletId: overflowFallback, created: false };
          }
          continue;
        }
        console.error("[findOrCreatePalletForRegion] insert:", insErr.message);
        throw insErr;
      }

      if (!inserted?.id) {
        throw new Error("findOrCreatePalletForRegion: insert returned no id");
      }

      return { palletId: inserted.id as string, created: true };
    }

    throw new Error("findOrCreatePalletForRegion: exceeded spin limit");
  } catch (e) {
    console.error("[findOrCreatePalletForRegion]", e);
    throw e;
  }
}

async function reservationRowCountForPallet(palletId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from("order_reservations")
    .select("id", { count: "exact", head: true })
    .eq("pallet_id", palletId);

  if (error) {
    console.error(
      "[cleanupEmptyPallets] reservation count error:",
      error.message,
    );
    return -1;
  }
  return count ?? 0;
}

async function bookingRowCountForPallet(palletId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("pallet_id", palletId);

  if (error) {
    console.error(
      "[cleanupEmptyPallets] booking count error:",
      error.message,
    );
    return -1;
  }
  return count ?? 0;
}

/**
 * Deletes virgin open pallets for the region+delivery pair that have zero
 * fill-weighted bottles and no history (no reservations, no bookings).
 * Pallets with history are kept — hygiene cron cancels long-empty ones.
 * Never throws.
 */
export async function cleanupEmptyPallets(
  shippingRegionId: string,
  deliveryZoneId: string,
): Promise<{ deleted: string[] }> {
  const sb = getSupabaseAdmin();
  const deleted: string[] = [];

  try {
    const { data: pallets, error: listErr } = await sb
      .from("pallets")
      .select("id")
      .eq("shipping_region_id", shippingRegionId)
      .eq("delivery_zone_id", deliveryZoneId)
      .eq("status", "open");

    if (listErr || !pallets?.length) {
      if (listErr) {
        console.error("[cleanupEmptyPallets] list:", listErr.message);
      }
      return { deleted };
    }

    for (const row of pallets) {
      const palletId = row.id as string;
      const refCount = await reservationRowCountForPallet(palletId);
      if (refCount < 0) continue;
      const bookingCount = await bookingRowCountForPallet(palletId);
      if (bookingCount < 0) continue;

      if (
        palletHasHistoryForCleanup({
          reservationCount: refCount,
          bookingCount,
        })
      ) {
        console.log(
          `[PALLET] Skipping delete for pallet ${palletId} (has history)`,
        );
        continue;
      }

      let bottles = 0;
      try {
        bottles = await sumReservedBottlesOnPallet(palletId);
      } catch (e) {
        console.error("[cleanupEmptyPallets] sum bottles:", e);
        continue;
      }

      if (bottles !== 0) continue;

      const { error: delErr } = await sb.from("pallets").delete().eq("id", palletId);
      if (delErr) {
        console.error(
          "[cleanupEmptyPallets] delete failed:",
          palletId,
          delErr.message,
        );
        continue;
      }

      deleted.push(palletId);
      console.log(`[PALLET] Auto-deleted empty virgin pallet ${palletId}`);
    }
  } catch (e) {
    console.error("[cleanupEmptyPallets]", e);
  }

  return { deleted };
}

export type ReservationCleanupSnapshot = {
  pallet_id: string | null;
  delivery_zone_id: string | null;
  shipping_region_id: string | null;
};

/**
 * After fill changes: evaluate the "becomes physical" trigger and create an
 * admin task when needed. Does **not** auto-set or lock
 * {@link pallets.current_pickup_producer_id} — admin confirms manually.
 *
 * Kept name for existing checkout/admin call sites. Never throws.
 */
export async function updatePickupProducerForPallet(
  palletId: string,
): Promise<{
  producerId: string | null;
  changed: boolean;
  usingFallback: boolean;
}> {
  const noop = {
    producerId: null as string | null,
    changed: false,
    usingFallback: false,
  };
  try {
    const { evaluatePalletPickupSelection } = await import(
      "@/lib/pallet-pickup-selection"
    );
    const result = await evaluatePalletPickupSelection(palletId);
    return {
      producerId: result.suggestion.producerId,
      changed: result.taskCreated,
      usingFallback: false,
    };
  } catch (e) {
    console.error("[updatePickupProducerForPallet]", e);
    return noop;
  }
}

/**
 * Removes checkout `bookings` rows for this reservation’s wines on the given pallet
 * so empty-pallet cleanup is not blocked after reject/decline.
 */
export async function releaseBookingsForReservationPallet(
  reservationId: string,
  palletId: string | null,
): Promise<void> {
  if (!palletId) return;
  const sb = getSupabaseAdmin();

  const { data: res, error: resErr } = await sb
    .from("order_reservations")
    .select("user_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (resErr) {
    console.error(
      "[releaseBookingsForReservationPallet] reservation:",
      resErr.message,
    );
    return;
  }

  const { data: items, error: itemsErr } = await sb
    .from("order_reservation_items")
    .select("item_id")
    .eq("reservation_id", reservationId);

  if (itemsErr) {
    console.error(
      "[releaseBookingsForReservationPallet] items:",
      itemsErr.message,
    );
    return;
  }

  const itemIds = [
    ...new Set(
      (items ?? [])
        .map((r) => r.item_id as string | null | undefined)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (itemIds.length === 0) return;

  const uid = res?.user_id as string | null | undefined;
  let q = sb.from("bookings").delete().eq("pallet_id", palletId).in("item_id", itemIds);
  if (uid) {
    q = q.eq("user_id", uid);
  }

  const { error: delErr } = await q;
  if (delErr) {
    console.error(
      "[releaseBookingsForReservationPallet] delete:",
      delErr.message,
    );
  }
}

export async function cleanupEmptyPalletsAfterReservationChange(
  snapshot: ReservationCleanupSnapshot,
): Promise<{ deleted: string[] }> {
  if (!snapshot.pallet_id || !snapshot.delivery_zone_id) {
    return { deleted: [] };
  }

  let regionId = snapshot.shipping_region_id;
  if (!regionId) {
    const sb = getSupabaseAdmin();
    const { data: pallet, error } = await sb
      .from("pallets")
      .select("shipping_region_id")
      .eq("id", snapshot.pallet_id)
      .maybeSingle();
    if (error) {
      console.error(
        "[cleanupEmptyPalletsAfterReservationChange] pallet load:",
        error.message,
      );
      return { deleted: [] };
    }
    regionId = (pallet?.shipping_region_id as string | null) ?? null;
  }

  if (!regionId) {
    return { deleted: [] };
  }

  return cleanupEmptyPallets(regionId, snapshot.delivery_zone_id);
}
