/**
 * Regular pallet hygiene: recalculate auto status and cancel long-empty pallets.
 * Invoked by /api/cron/pallet-hygiene. Never sends emails.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncPalletShipReadiness } from "@/lib/pallet-completion";
import {
  sumReservedBottlesOnPalletResult,
} from "@/lib/pallet-fill-count";
import { PALLET_ACCEPTING_STATUSES } from "@/lib/pallet-ship-progress";

/** Empty (0 active bottles) for this long → status cancelled (not deleted). */
export const EMPTY_PALLET_CANCEL_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function namePalletForRoute(
  regionName: string,
  deliveryName: string,
  existingPalletCountOnRoute: number,
): string {
  const base = `${regionName} to ${deliveryName}`;
  const prior = Math.max(0, Math.floor(Number(existingPalletCountOnRoute) || 0));
  if (prior <= 0) return base;
  return `${base} #${prior + 1}`;
}

/**
 * History that must block cleanupEmptyPallets deletes.
 * Reservation rows (any status) or bookings tied to the pallet.
 */
export function palletHasHistoryForCleanup(input: {
  reservationCount: number;
  bookingCount: number;
}): boolean {
  return (
    Math.max(0, Math.floor(Number(input.reservationCount) || 0)) > 0 ||
    Math.max(0, Math.floor(Number(input.bookingCount) || 0)) > 0
  );
}

/**
 * When bottles are 0, empty-since is the latest reservation terminal / create
 * activity; if the pallet never had reservations, use pallet.created_at.
 */
export function resolveEmptySinceIso(input: {
  palletCreatedAt: string;
  latestReservationActivityAt: string | null;
}): string {
  const fromRes = input.latestReservationActivityAt?.trim();
  if (fromRes) return fromRes;
  return input.palletCreatedAt;
}

export function shouldCancelEmptyPallet(input: {
  status: string | null | undefined;
  bottles: number;
  emptySinceIso: string;
  nowMs?: number;
}): boolean {
  if (Math.max(0, Math.floor(Number(input.bottles) || 0)) !== 0) {
    return false;
  }
  const status = String(input.status ?? "")
    .trim()
    .toLowerCase();
  if (status === "cancelled") return false;

  const sinceMs = Date.parse(input.emptySinceIso);
  if (!Number.isFinite(sinceMs)) return false;

  const now = input.nowMs ?? Date.now();
  return now - sinceMs >= EMPTY_PALLET_CANCEL_AFTER_MS;
}

/**
 * Never cancel the last accepting pallet on a live-wine shipping route.
 * Cancelling that row left checkout with 0 pallets (noPickupForCart) until a
 * replacement was created — see 3985cbfe on 2026-10-30.
 */
export function shouldPreserveLastAcceptingPallet(input: {
  acceptingCountOnRoute: number;
  regionHasLiveInventory: boolean;
}): boolean {
  if (!input.regionHasLiveInventory) return false;
  return Math.max(0, Math.floor(Number(input.acceptingCountOnRoute) || 0)) <= 1;
}

function maxIso(a: string | null | undefined, b: string | null | undefined): string | null {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  const aOk = Number.isFinite(ta);
  const bOk = Number.isFinite(tb);
  if (!aOk && !bOk) return null;
  if (!aOk) return b ?? null;
  if (!bOk) return a ?? null;
  return ta >= tb ? (a as string) : (b as string);
}

/** Latest activity timestamp for a reservation row used as empty-since signal. */
export function reservationEmptyActivityAt(row: {
  created_at?: string | null;
  cancelled_at?: string | null;
  archived_at?: string | null;
  producer_rejected_at?: string | null;
}): string | null {
  let latest: string | null = null;
  for (const key of [
    "cancelled_at",
    "archived_at",
    "producer_rejected_at",
    "created_at",
  ] as const) {
    latest = maxIso(latest, row[key] ?? null);
  }
  return latest;
}

export type PalletHygieneResult = {
  synced: number;
  syncErrors: number;
  cancelled: string[];
  cancelSkipped: number;
};

/**
 * 1) syncPalletShipReadiness for every status_mode=auto pallet (no emails).
 * 2) Cancel any pallet with 0 active bottles empty ≥ 7 days (any status except
 *    already cancelled). Does not delete.
 */
export async function runPalletHygiene(options?: {
  nowMs?: number;
}): Promise<PalletHygieneResult> {
  const sb = getSupabaseAdmin();
  const nowMs = options?.nowMs ?? Date.now();
  const result: PalletHygieneResult = {
    synced: 0,
    syncErrors: 0,
    cancelled: [],
    cancelSkipped: 0,
  };

  const { data: autoPallets, error: autoErr } = await sb
    .from("pallets")
    .select("id")
    .eq("status_mode", "auto");

  if (autoErr) {
    console.error("[pallet-hygiene] list auto pallets:", autoErr.message);
    throw autoErr;
  }

  for (const row of autoPallets ?? []) {
    const id = row.id as string;
    if (!id) continue;
    try {
      await syncPalletShipReadiness(id, { allowNotifications: false });
      result.synced += 1;
    } catch (e) {
      result.syncErrors += 1;
      console.error("[pallet-hygiene] sync failed:", id, e);
    }
  }

  const { data: candidates, error: listErr } = await sb
    .from("pallets")
    .select("id, status, created_at, shipping_region_id, delivery_zone_id")
    .neq("status", "cancelled");

  if (listErr) {
    console.error("[pallet-hygiene] list for cancel:", listErr.message);
    throw listErr;
  }

  for (const pallet of candidates ?? []) {
    const palletId = pallet.id as string;
    if (!palletId) continue;

    const fill = await sumReservedBottlesOnPalletResult(palletId);
    if (!fill.ok) {
      result.cancelSkipped += 1;
      console.error(
        "[pallet-hygiene] fill unavailable, skip cancel:",
        palletId,
        fill.error,
      );
      continue;
    }
    if (fill.bottles !== 0) continue;

    const { data: resRows, error: resErr } = await sb
      .from("order_reservations")
      .select(
        "created_at, cancelled_at, archived_at, producer_rejected_at",
      )
      .eq("pallet_id", palletId);

    if (resErr) {
      result.cancelSkipped += 1;
      console.error(
        "[pallet-hygiene] reservations for empty-since:",
        palletId,
        resErr.message,
      );
      continue;
    }

    let latestActivity: string | null = null;
    for (const r of resRows ?? []) {
      latestActivity = maxIso(
        latestActivity,
        reservationEmptyActivityAt(
          r as {
            created_at?: string | null;
            cancelled_at?: string | null;
            archived_at?: string | null;
            producer_rejected_at?: string | null;
          },
        ),
      );
    }

    const emptySinceIso = resolveEmptySinceIso({
      palletCreatedAt: String(pallet.created_at ?? new Date(0).toISOString()),
      latestReservationActivityAt: latestActivity,
    });

    if (
      !shouldCancelEmptyPallet({
        status: pallet.status as string,
        bottles: fill.bottles,
        emptySinceIso,
        nowMs,
      })
    ) {
      continue;
    }

    const shippingRegionId =
      typeof pallet.shipping_region_id === "string"
        ? pallet.shipping_region_id
        : null;
    const deliveryZoneId =
      typeof pallet.delivery_zone_id === "string"
        ? pallet.delivery_zone_id
        : null;

    if (shippingRegionId && deliveryZoneId) {
      const [{ count: acceptingCount, error: accErr }, liveInventory] =
        await Promise.all([
          sb
            .from("pallets")
            .select("id", { count: "exact", head: true })
            .eq("shipping_region_id", shippingRegionId)
            .eq("delivery_zone_id", deliveryZoneId)
            .in("status", [...PALLET_ACCEPTING_STATUSES]),
          regionHasLiveSaleableWines(shippingRegionId),
        ]);

      if (accErr) {
        result.cancelSkipped += 1;
        console.error(
          "[pallet-hygiene] accepting count:",
          palletId,
          accErr.message,
        );
        continue;
      }

      if (
        shouldPreserveLastAcceptingPallet({
          acceptingCountOnRoute: acceptingCount ?? 0,
          regionHasLiveInventory: liveInventory,
        })
      ) {
        result.cancelSkipped += 1;
        console.log(
          `[PALLET] Hygiene skip cancel for last accepting pallet ${palletId} (live inventory on route)`,
        );
        continue;
      }
    }

    const { error: cancelErr } = await sb
      .from("pallets")
      .update({
        status: "cancelled",
        updated_at: new Date(nowMs).toISOString(),
      })
      .eq("id", palletId)
      .neq("status", "cancelled");

    if (cancelErr) {
      result.cancelSkipped += 1;
      console.error(
        "[pallet-hygiene] cancel failed:",
        palletId,
        cancelErr.message,
      );
      continue;
    }

    result.cancelled.push(palletId);
    console.log(
      `[PALLET] Hygiene cancelled empty pallet ${palletId} (empty since ${emptySinceIso})`,
    );
  }

  return result;
}

async function regionHasLiveSaleableWines(
  shippingRegionId: string,
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const { data: producers, error: prodErr } = await sb
    .from("producers")
    .select("id")
    .eq("shipping_region_id", shippingRegionId);

  if (prodErr) {
    console.error(
      "[pallet-hygiene] producers for live check:",
      prodErr.message,
    );
    // Fail closed: preserve the pallet rather than strand checkout.
    return true;
  }

  const producerIds = (producers ?? [])
    .map((p) => p.id as string)
    .filter((id) => typeof id === "string" && id.length > 0);
  if (producerIds.length === 0) return false;

  const { data: wines, error: wineErr } = await sb
    .from("wines")
    .select("id")
    .in("producer_id", producerIds)
    .eq("is_live", true)
    .limit(1);

  if (wineErr) {
    console.error("[pallet-hygiene] wines for live check:", wineErr.message);
    return true;
  }

  return (wines?.length ?? 0) > 0;
}
