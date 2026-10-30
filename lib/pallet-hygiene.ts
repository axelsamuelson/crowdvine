/**
 * Regular pallet hygiene: recalculate auto status and cancel long-empty pallets.
 * Invoked by /api/cron/pallet-hygiene. Never sends emails.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncPalletShipReadiness } from "@/lib/pallet-completion";
import {
  sumReservedBottlesOnPalletResult,
} from "@/lib/pallet-fill-count";

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
    .select("id, status, created_at")
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
