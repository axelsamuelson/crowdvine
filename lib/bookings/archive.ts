import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Soft-archive status for legacy checkout `bookings` rows. */
export const ARCHIVED_BOOKING_STATUS = "archived" as const;

/** Statuses that count as active (pre-archive) bookings. */
export const ACTIVE_BOOKING_STATUSES = ["reserved"] as const;

export function isBookingArchived(row: {
  status?: string | null;
  archived_at?: string | null;
}): boolean {
  if (row.archived_at != null && String(row.archived_at).trim() !== "") {
    return true;
  }
  return String(row.status ?? "").toLowerCase() === ARCHIVED_BOOKING_STATUS;
}

export type ArchiveBookingResult =
  | { ok: true; booking: Record<string, unknown> }
  | { ok: false; error: string; status?: number };

/**
 * Soft-archive a booking. Keeps the row; active lists/fill paths must exclude it.
 */
export async function archiveBooking(params: {
  bookingId: string;
  reason?: string | null;
}): Promise<ArchiveBookingResult> {
  const sb = getSupabaseAdmin();
  const id = params.bookingId.trim();
  if (!id) return { ok: false, error: "Missing booking id", status: 400 };

  const { data: existing, error: loadErr } = await sb
    .from("bookings")
    .select("id, status, archived_at, pallet_id")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return { ok: false, error: loadErr.message, status: 500 };
  }
  if (!existing) {
    return { ok: false, error: "Booking not found", status: 404 };
  }

  if (isBookingArchived(existing)) {
    return { ok: true, booking: existing as Record<string, unknown> };
  }

  const previousStatus =
    typeof existing.status === "string" && existing.status.trim() !== ""
      ? existing.status.trim()
      : "reserved";

  const now = new Date().toISOString();
  const reason =
    typeof params.reason === "string" && params.reason.trim() !== ""
      ? params.reason.trim().slice(0, 500)
      : null;

  const { data: updated, error: updErr } = await sb
    .from("bookings")
    .update({
      status: ARCHIVED_BOOKING_STATUS,
      status_before_archive: previousStatus,
      archived_at: now,
      archive_reason: reason,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updErr || !updated) {
    return {
      ok: false,
      error: updErr?.message ?? "Failed to archive booking",
      status: 500,
    };
  }

  return { ok: true, booking: updated as Record<string, unknown> };
}

/**
 * Restore a soft-archived booking to its prior status (default reserved).
 */
export async function unarchiveBooking(params: {
  bookingId: string;
}): Promise<ArchiveBookingResult> {
  const sb = getSupabaseAdmin();
  const id = params.bookingId.trim();
  if (!id) return { ok: false, error: "Missing booking id", status: 400 };

  const { data: existing, error: loadErr } = await sb
    .from("bookings")
    .select("id, status, archived_at, status_before_archive, pallet_id")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return { ok: false, error: loadErr.message, status: 500 };
  }
  if (!existing) {
    return { ok: false, error: "Booking not found", status: 404 };
  }

  if (!isBookingArchived(existing)) {
    return { ok: true, booking: existing as Record<string, unknown> };
  }

  const restoreStatus =
    typeof existing.status_before_archive === "string" &&
    existing.status_before_archive.trim() !== "" &&
    existing.status_before_archive.trim().toLowerCase() !==
      ARCHIVED_BOOKING_STATUS
      ? existing.status_before_archive.trim()
      : "reserved";

  const { data: updated, error: updErr } = await sb
    .from("bookings")
    .update({
      status: restoreStatus,
      status_before_archive: null,
      archived_at: null,
      archive_reason: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updErr || !updated) {
    return {
      ok: false,
      error: updErr?.message ?? "Failed to unarchive booking",
      status: 500,
    };
  }

  return { ok: true, booking: updated as Record<string, unknown> };
}
