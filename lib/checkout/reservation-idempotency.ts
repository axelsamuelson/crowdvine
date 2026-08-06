/**
 * Checkout reservation idempotency helpers.
 * Prevents duplicate order_reservations from double-submit / retries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ExistingReservationRef = {
  id: string;
  checkout_group_id: string | null;
};

export function parseIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!UUID_RE.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export async function findReservationByIdempotencyKey(
  sb: SupabaseClient,
  key: string,
): Promise<ExistingReservationRef | null> {
  const { data, error } = await sb
    .from("order_reservations")
    .select("id, checkout_group_id")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error) {
    // Column may not exist yet pre-migration.
    if (/idempotency_key|schema cache|Could not find/i.test(error.message || "")) {
      return null;
    }
    console.warn("[reservation-idempotency] lookup by key:", error.message);
    return null;
  }
  if (!data?.id) return null;
  return {
    id: String(data.id),
    checkout_group_id:
      typeof data.checkout_group_id === "string" ? data.checkout_group_id : null,
  };
}

/**
 * Same user + same cart within the last `windowSeconds` → treat as duplicate submit.
 */
export async function findRecentDuplicateReservation(
  sb: SupabaseClient,
  opts: {
    userId: string;
    cartId: string;
    windowSeconds?: number;
  },
): Promise<ExistingReservationRef | null> {
  const windowSeconds = opts.windowSeconds ?? 60;
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { data, error } = await sb
    .from("order_reservations")
    .select("id, checkout_group_id, created_at")
    .eq("user_id", opts.userId)
    .eq("cart_id", opts.cartId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[reservation-idempotency] recent duplicate lookup:", error.message);
    return null;
  }
  if (!data?.id) return null;
  return {
    id: String(data.id),
    checkout_group_id:
      typeof data.checkout_group_id === "string" ? data.checkout_group_id : null,
  };
}

export function buildReservationSuccessResponse(
  existing: ExistingReservationRef,
  opts?: { message?: string },
): {
  success: true;
  reservationId: string;
  checkoutGroupId?: string;
  redirectUrl: string;
  idempotentReplay: true;
} {
  const message =
    opts?.message ?? "Reservation placed successfully";
  const groupQ = existing.checkout_group_id
    ? `&checkoutGroupId=${encodeURIComponent(existing.checkout_group_id)}`
    : "";
  return {
    success: true,
    reservationId: existing.id,
    ...(existing.checkout_group_id
      ? { checkoutGroupId: existing.checkout_group_id }
      : {}),
    redirectUrl: `/checkout/success?success=true&reservationId=${encodeURIComponent(
      existing.id,
    )}${groupQ}&message=${encodeURIComponent(message)}`,
    idempotentReplay: true,
  };
}

/** Postgres unique_violation */
export function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(error.message || "");
}
