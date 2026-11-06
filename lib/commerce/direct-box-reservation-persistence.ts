/**
 * Direct_box reservation persistence helpers used by confirm.
 * Guarantees null pallet_id and no pallet-fill accounting for every group.
 *
 * Durable ops handoff uses fulfillment_dispatch_status (migration 277), NOT
 * charge_blocked_reason (billing hold semantics). Until 277 is applied,
 * confirm/webhook MUST fail closed for direct_box — no ambiguous fallback.
 */

import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";
import { reservationPersistenceForDirectBox } from "@/lib/commerce/direct-box-payment-contract";

/** @deprecated Legacy marker written only before dispatch-status architecture. Kept for idempotent reads. */
export const DIRECT_BOX_FULFILLMENT_PENDING_REASON =
  "DIRECT_BOX_FULFILLMENT_PENDING" as const;

export const DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING =
  "pending_manual_handoff" as const;

export const DIRECT_BOX_FULFILLMENT_DISPATCH_BOOKED = "booked" as const;
export const DIRECT_BOX_FULFILLMENT_DISPATCH_SKIPPED = "skipped" as const;

/**
 * Group / single-row pallet resolution for confirm.
 * direct_box ALWAYS returns null pallet — never selectedPalletId / findOrCreate.
 */
export function resolveCheckoutGroupPalletAssignment(input: {
  channel: FulfillmentChannel | null;
  bodySelectedPalletId?: string | null;
  topLevelPalletId: string | null;
  /** Result of shared findOrCreate / region path — ignored for direct_box. */
  sharedGroupPalletId?: string | null;
  sharedGroupShippingRegionId?: string | null;
}): {
  pallet_id: string | null;
  shipping_region_id: string | null;
  countsTowardPalletFill: boolean;
  fulfillment_channel: FulfillmentChannel | null;
} {
  if (input.channel === "direct_box") {
    const persist = reservationPersistenceForDirectBox({
      persistChannelColumn: true,
    });
    return {
      pallet_id: null,
      shipping_region_id: null,
      countsTowardPalletFill: false,
      fulfillment_channel: persist.fulfillment_channel ?? "direct_box",
    };
  }

  const selected =
    typeof input.bodySelectedPalletId === "string" &&
    input.bodySelectedPalletId.trim()
      ? input.bodySelectedPalletId.trim()
      : null;
  const pallet =
    selected ??
    (typeof input.sharedGroupPalletId === "string"
      ? input.sharedGroupPalletId
      : null) ??
    input.topLevelPalletId;

  return {
    pallet_id: pallet,
    shipping_region_id: input.sharedGroupShippingRegionId ?? null,
    countsTowardPalletFill: Boolean(pallet),
    fulfillment_channel: input.channel === "shared_pallet" ? "shared_pallet" : null,
  };
}

/**
 * Patch fields for order_reservations insert/update on direct_box.
 * Requires migration 277 columns — callers fail closed on missing schema
 * (no charge_blocked_reason overload; no silent strip-retry into billing hold).
 */
export function buildDirectBoxReservationInsertPatch(_input?: {
  includeChannelColumn?: boolean;
}): Record<string, unknown> {
  return {
    pallet_id: null,
    shipping_region_id: null,
    fulfillment_channel: "direct_box" as const,
    fulfillment_dispatch_status: DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING,
  };
}

/** Detect PostgREST / Postgres unknown-column errors for fail-closed schema checks. */
export function isMissingSchemaColumnError(
  error: { message?: string; code?: string } | null | undefined,
  column: string,
): boolean {
  if (!error?.message) return false;
  const msg = error.message;
  return (
    new RegExp(column, "i").test(msg) &&
    /schema cache|Could not find|column|does not exist/i.test(msg)
  );
}

export function isDirectBoxSchemaUnreadyError(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  return (
    isMissingSchemaColumnError(error, "fulfillment_dispatch_status") ||
    isMissingSchemaColumnError(error, "fulfillment_channel")
  );
}

export function normalizeFulfillmentDispatchStatus(
  raw: string | null | undefined,
): string | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  return v || null;
}

/** Progressed ops states must not be reset to pending by webhook retries. */
export function isDirectBoxFulfillmentProgressed(
  status: string | null | undefined,
): boolean {
  const v = normalizeFulfillmentDispatchStatus(status);
  return (
    v === DIRECT_BOX_FULFILLMENT_DISPATCH_BOOKED ||
    v === DIRECT_BOX_FULFILLMENT_DISPATCH_SKIPPED ||
    v === "cancelled" ||
    v === "complete" ||
    v === "completed"
  );
}

export function isDirectBoxFulfillmentAlreadyPending(row: {
  charge_blocked_reason?: string | null;
  fulfillment_dispatch_status?: string | null;
  fulfillment_channel?: string | null;
}): boolean {
  if (isDirectBoxFulfillmentProgressed(row.fulfillment_dispatch_status)) {
    return true; // treat as "already handled" for mark-pending idempotency
  }
  const dispatch = normalizeFulfillmentDispatchStatus(
    row.fulfillment_dispatch_status,
  );
  if (
    dispatch === DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING ||
    dispatch === "pending"
  ) {
    return true;
  }
  // Legacy rows written during review — still idempotent, not a billing hold.
  const reason = String(row.charge_blocked_reason ?? "").trim();
  if (reason === DIRECT_BOX_FULFILLMENT_PENDING_REASON) return true;
  return false;
}

/** Admin: charge_blocked_reason that is NOT a disguised fulfillment handoff. */
export function isBillingChargeHoldReason(
  reason: string | null | undefined,
): boolean {
  const r = String(reason ?? "").trim();
  if (!r) return false;
  if (r === DIRECT_BOX_FULFILLMENT_PENDING_REASON) return false;
  return true;
}
