import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  PALLET_FILL_STATUSES,
  sumReservedBottlesOnPallet,
} from "@/lib/pallet-fill-count";

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

/** Minimum share of pallet bottles for a pallet-zone producer to win pickup (priority 1). */
export const PALLET_ZONE_PRIORITY_THRESHOLD = 0.20;

/** When reserved bottles reach this fraction of nominal capacity, the open pallet is closed and a new one is created. */
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
    const name = `${regionName} to ${deliveryName}`;

    for (let spin = 0; spin < MAX_FIND_OR_CREATE_SPINS; spin++) {
      const { data: existing, error: findErr } = await sb
        .from("pallets")
        .select("id, bottle_capacity")
        .eq("shipping_region_id", shippingRegionId)
        .eq("delivery_zone_id", deliveryZoneId)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();

      if (findErr) {
        console.error("[findOrCreatePalletForRegion] select:", findErr.message);
        throw findErr;
      }

      if (existing?.id) {
        let bottles = 0;
        try {
          bottles = await sumReservedBottlesOnPallet(existing.id as string);
        } catch (e) {
          console.error("[findOrCreatePalletForRegion] sum bottles:", e);
          return { palletId: existing.id as string, created: false };
        }

        const cap = Math.max(0, Math.floor(Number(existing.bottle_capacity) || 0));
        const overflowCap = Math.floor(cap * PALLET_OVERFLOW_THRESHOLD);

        if (cap > 0 && bottles >= overflowCap) {
          const { error: closeErr } = await sb
            .from("pallets")
            .update({
              status: "complete",
              is_complete: true,
              completed_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (closeErr) {
            console.error(
              "[findOrCreatePalletForRegion] overflow close:",
              closeErr.message,
            );
          }
          continue;
        }

        return { palletId: existing.id as string, created: false };
      }

      const { data: inserted, error: insErr } = await sb
        .from("pallets")
        .insert({
          name,
          shipping_region_id: shippingRegionId,
          delivery_zone_id: deliveryZoneId,
          pickup_zone_id: null,
          bottle_capacity: 720,
          cost_cents: 50000,
          status: "open",
          current_pickup_producer_id: null,
        })
        .select("id")
        .single();

      if (insErr) {
        if (insErr.code === PG_UNIQUE_VIOLATION) {
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

/**
 * Deletes open pallets for the region+delivery pair that have no reservations
 * and zero fill-weighted bottles. Never throws.
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
      if (refCount > 0) {
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
      console.log(`[PALLET] Auto-deleted empty pallet ${palletId}`);
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
 * Sets {@link pallets.current_pickup_producer_id} from pallet fill and region producers.
 * Priority: pallet-zone producers with at least 20% of pallet bottles; else producer with
 * most bottles in the region. Never throws.
 */
const PICKUP_PRODUCER_LOCKED_STATUSES = new Set([
  "shipping_ordered",
  "complete",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "shipped",
  "delivered",
]);

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
    const sb = getSupabaseAdmin();
    const { data: pallet, error: pErr } = await sb
      .from("pallets")
      .select("id, shipping_region_id, current_pickup_producer_id, status")
      .eq("id", palletId)
      .maybeSingle();

    if (pErr || !pallet) {
      if (pErr) {
        console.error("[updatePickupProducerForPallet] pallet:", pErr.message);
      }
      return noop;
    }

    const palletStatus = String(
      (pallet as { status?: string | null }).status ?? "",
    ).toLowerCase();
    if (PICKUP_PRODUCER_LOCKED_STATUSES.has(palletStatus)) {
      const lockedProducerId =
        (pallet.current_pickup_producer_id as string | null | undefined) ??
        null;
      console.log(
        `[PALLET] Pickup producer locked for pallet ${palletId} (status: ${palletStatus})`,
      );
      return {
        producerId: lockedProducerId,
        changed: false,
        usingFallback: false,
      };
    }

    const regionId = pallet.shipping_region_id as string | null | undefined;
    if (!regionId) {
      return noop;
    }

    let totalBottles = 0;
    try {
      totalBottles = await sumReservedBottlesOnPallet(palletId);
    } catch (e) {
      console.error("[updatePickupProducerForPallet] total bottles:", e);
      return noop;
    }

    if (totalBottles === 0) {
      const normalizedCurrent =
        (pallet.current_pickup_producer_id as string | null | undefined) ??
        null;
      if (normalizedCurrent === null) {
        return { producerId: null, changed: false, usingFallback: false };
      }
      const { error: uErr } = await sb
        .from("pallets")
        .update({
          current_pickup_producer_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", palletId);
      if (uErr) {
        console.error("[updatePickupProducerForPallet] update:", uErr.message);
        return {
          producerId: normalizedCurrent,
          changed: false,
          usingFallback: false,
        };
      }
      return { producerId: null, changed: true, usingFallback: false };
    }

    const { data: regionProducers, error: rpErr } = await sb
      .from("producers")
      .select("id, is_pallet_zone")
      .eq("shipping_region_id", regionId);

    if (rpErr || !regionProducers?.length) {
      if (rpErr) {
        console.error(
          "[updatePickupProducerForPallet] region producers:",
          rpErr.message,
        );
      }
      return noop;
    }

    type ProdRow = { id: string; is_pallet_zone: boolean | null };
    const producersList: ProdRow[] = regionProducers
      .map((r) => ({
        id: String(r.id ?? ""),
        is_pallet_zone: r.is_pallet_zone === true,
      }))
      .filter((r) => r.id.length > 0)
      .sort((a, b) => a.id.localeCompare(b.id));

    const producerById = new Map(producersList.map((p) => [p.id, p]));
    const counts = new Map<string, number>();
    for (const p of producersList) {
      counts.set(p.id, 0);
    }

    const { data: reservations, error: rErr } = await sb
      .from("order_reservations")
      .select("id")
      .eq("pallet_id", palletId)
      .in("status", [...PALLET_FILL_STATUSES]);

    if (rErr) {
      console.error(
        "[updatePickupProducerForPallet] reservations:",
        rErr.message,
      );
      return noop;
    }

    const resIds = (reservations ?? [])
      .map((r) => r.id as string | null | undefined)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (resIds.length > 0) {
      const { data: oriRows, error: oriErr } = await sb
        .from("order_reservation_items")
        .select("quantity, item_id")
        .in("reservation_id", resIds);

      if (oriErr) {
        console.error(
          "[updatePickupProducerForPallet] items:",
          oriErr.message,
        );
        return noop;
      }

      const wineIds = [
        ...new Set(
          (oriRows ?? [])
            .map((row) => row.item_id as string | null | undefined)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        ),
      ];

      if (wineIds.length > 0) {
        const { data: wineRows, error: wErr } = await sb
          .from("wines")
          .select("id, producer_id")
          .in("id", wineIds);

        if (wErr) {
          console.error(
            "[updatePickupProducerForPallet] wines:",
            wErr.message,
          );
          return noop;
        }

        const wineToProducer = new Map(
          (wineRows ?? []).map((w) => [
            w.id as string,
            w.producer_id as string | null,
          ]),
        );

        for (const row of oriRows ?? []) {
          const wineId = row.item_id as string | null | undefined;
          if (!wineId) continue;
          const prod = wineToProducer.get(wineId);
          if (!prod || !counts.has(prod)) continue;
          const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
          counts.set(prod, (counts.get(prod) ?? 0) + qty);
        }
      }
    }

    const threshold = Math.floor(
      totalBottles * PALLET_ZONE_PRIORITY_THRESHOLD,
    );

    const pickWinner = (candidateIds: string[]): string | null => {
      if (candidateIds.length === 0) return null;
      const ranked = [...candidateIds].sort((a, b) => {
        const ca = counts.get(a) ?? 0;
        const cb = counts.get(b) ?? 0;
        if (cb !== ca) return cb - ca;
        return a.localeCompare(b);
      });
      return ranked[0] ?? null;
    };

    const zoneProducerIds = producersList
      .filter((p) => p.is_pallet_zone)
      .map((p) => p.id);

    const zoneMeetingThreshold = zoneProducerIds.filter(
      (id) => (counts.get(id) ?? 0) >= threshold,
    );

    let winnerId: string | null = null;
    if (zoneMeetingThreshold.length > 0) {
      winnerId = pickWinner(zoneMeetingThreshold);
    } else {
      const allIds = producersList.map((p) => p.id);
      const fallbackId = pickWinner(allIds);
      const maxCount = fallbackId
        ? (counts.get(fallbackId) ?? 0)
        : 0;
      winnerId = maxCount > 0 ? fallbackId : null;
    }

    const winnerRow = winnerId ? producerById.get(winnerId) : undefined;
    const usingFallback = Boolean(
      winnerId && winnerRow && !winnerRow.is_pallet_zone,
    );

    const normalizedCurrent =
      (pallet.current_pickup_producer_id as string | null | undefined) ?? null;
    const normalizedWinner = winnerId;

    if (normalizedWinner === normalizedCurrent) {
      return {
        producerId: normalizedWinner,
        changed: false,
        usingFallback,
      };
    }

    const { error: uErr } = await sb
      .from("pallets")
      .update({
        current_pickup_producer_id: normalizedWinner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", palletId);

    if (uErr) {
      console.error("[updatePickupProducerForPallet] update:", uErr.message);
      return {
        producerId: normalizedCurrent,
        changed: false,
        usingFallback: false,
      };
    }

    console.log(
      `[PALLET] Pickup producer changed for pallet ${palletId}: ${normalizedCurrent ?? "null"} → ${normalizedWinner ?? "null"}`,
    );

    return {
      producerId: normalizedWinner,
      changed: true,
      usingFallback,
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
