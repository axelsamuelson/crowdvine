import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Soft-archive status: kept in DB, never treated as an active order. */
export const ARCHIVED_RESERVATION_STATUS = "archived" as const;

/**
 * Statuses that must not count as active reservations (denylist complements).
 * Prefer allowlists (PALLET_FILL_STATUSES) where possible; use this for
 * "NOT IN terminal" style guards.
 */
export const NON_ACTIVE_RESERVATION_STATUSES = [
  "cancelled",
  "rejected",
  "declined",
  ARCHIVED_RESERVATION_STATUS,
] as const;

export type NonActiveReservationStatus =
  (typeof NON_ACTIVE_RESERVATION_STATUSES)[number];

/** PostgREST `in` filter literal for `.not("status", "in", ...)`. */
export const NON_ACTIVE_RESERVATION_STATUSES_POSTGREST = `("${NON_ACTIVE_RESERVATION_STATUSES.join(
  '","',
)}")`;

export function isReservationArchived(row: {
  status?: string | null;
  archived_at?: string | null;
}): boolean {
  if (row.archived_at != null && String(row.archived_at).trim() !== "") {
    return true;
  }
  return String(row.status ?? "").toLowerCase() === ARCHIVED_RESERVATION_STATUS;
}

export type ArchiveReservationResult =
  | { ok: true; reservation: Record<string, unknown> }
  | { ok: false; error: string; status?: number };

/**
 * Soft-archive a reservation. No emails. Does not delete data.
 * Keeps pallet_id for history; fill/payment paths exclude status=archived.
 */
export async function archiveReservation(params: {
  reservationId: string;
  reason?: string | null;
}): Promise<ArchiveReservationResult> {
  const sb = getSupabaseAdmin();
  const id = params.reservationId.trim();
  if (!id) return { ok: false, error: "Missing reservation id", status: 400 };

  const { data: existing, error: loadErr } = await sb
    .from("order_reservations")
    .select("id, status, archived_at, pallet_id, retry_scheduled_at")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return { ok: false, error: loadErr.message, status: 500 };
  }
  if (!existing) {
    return { ok: false, error: "Reservation not found", status: 404 };
  }

  if (isReservationArchived(existing)) {
    return { ok: true, reservation: existing as Record<string, unknown> };
  }

  const previousStatus =
    typeof existing.status === "string" && existing.status.trim() !== ""
      ? existing.status.trim()
      : null;

  const now = new Date().toISOString();
  const reason =
    typeof params.reason === "string" && params.reason.trim() !== ""
      ? params.reason.trim().slice(0, 500)
      : null;

  const { data: updated, error: updErr } = await sb
    .from("order_reservations")
    .update({
      status: ARCHIVED_RESERVATION_STATUS,
      status_before_archive: previousStatus,
      archived_at: now,
      archive_reason: reason,
      retry_scheduled_at: null,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updErr || !updated) {
    return {
      ok: false,
      error: updErr?.message ?? "Failed to archive reservation",
      status: 500,
    };
  }

  const palletId =
    typeof existing.pallet_id === "string" && existing.pallet_id.trim() !== ""
      ? existing.pallet_id.trim()
      : null;
  if (palletId) {
    try {
      const { syncPalletShipReadiness } = await import("@/lib/pallet-completion");
      await syncPalletShipReadiness(palletId);
    } catch (e) {
      console.error(
        `[archive] syncPalletShipReadiness after archive reservation_id=${id}:`,
        e,
      );
    }
  }

  return { ok: true, reservation: updated as Record<string, unknown> };
}

/**
 * Restore a soft-archived reservation to its prior lifecycle status.
 * No emails.
 */
export async function unarchiveReservation(params: {
  reservationId: string;
}): Promise<ArchiveReservationResult> {
  const sb = getSupabaseAdmin();
  const id = params.reservationId.trim();
  if (!id) return { ok: false, error: "Missing reservation id", status: 400 };

  const { data: existing, error: loadErr } = await sb
    .from("order_reservations")
    .select(
      "id, status, archived_at, status_before_archive, pallet_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return { ok: false, error: loadErr.message, status: 500 };
  }
  if (!existing) {
    return { ok: false, error: "Reservation not found", status: 404 };
  }

  if (!isReservationArchived(existing)) {
    return { ok: true, reservation: existing as Record<string, unknown> };
  }

  const restoreStatus =
    typeof existing.status_before_archive === "string" &&
    existing.status_before_archive.trim() !== "" &&
    existing.status_before_archive.trim().toLowerCase() !==
      ARCHIVED_RESERVATION_STATUS
      ? existing.status_before_archive.trim()
      : "cancelled";

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await sb
    .from("order_reservations")
    .update({
      status: restoreStatus,
      status_before_archive: null,
      archived_at: null,
      archive_reason: null,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updErr || !updated) {
    return {
      ok: false,
      error: updErr?.message ?? "Failed to unarchive reservation",
      status: 500,
    };
  }

  const palletId =
    typeof existing.pallet_id === "string" && existing.pallet_id.trim() !== ""
      ? existing.pallet_id.trim()
      : null;
  if (palletId) {
    try {
      const { syncPalletShipReadiness } = await import("@/lib/pallet-completion");
      await syncPalletShipReadiness(palletId);
    } catch (e) {
      console.error(
        `[archive] syncPalletShipReadiness after unarchive reservation_id=${id}:`,
        e,
      );
    }
  }

  return { ok: true, reservation: updated as Record<string, unknown> };
}
