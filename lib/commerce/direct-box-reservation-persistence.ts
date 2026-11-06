/**
 * Direct_box reservation persistence helpers used by confirm.
 * Guarantees null pallet_id and no pallet-fill accounting for every group.
 *
 * fulfillment_channel column is draft (migration 277) — callers use
 * buildDirectBoxReservationInsertPatch which omits unknown columns when
 * schema is not yet migrated (safe on deployed default-OFF prod).
 */

import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";
import { reservationPersistenceForDirectBox } from "@/lib/commerce/direct-box-payment-contract";

/** Ops-visible durable handoff when no live direct carrier booking exists. */
export const DIRECT_BOX_FULFILLMENT_PENDING_REASON =
  "DIRECT_BOX_FULFILLMENT_PENDING" as const;

export const DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING =
  "pending_manual_handoff" as const;

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
 * Includes channel + durable pending handoff reason (deployed column).
 */
export function buildDirectBoxReservationInsertPatch(input?: {
  /** When false, omit fulfillment_channel (pre-migration 277). Default true — caller strips on schema error. */
  includeChannelColumn?: boolean;
}): Record<string, unknown> {
  const includeChannel = input?.includeChannelColumn !== false;
  return {
    pallet_id: null,
    shipping_region_id: null,
    ...(includeChannel ? { fulfillment_channel: "direct_box" as const } : {}),
    // Deployed column — visible ops handoff until a real carrier books.
    charge_blocked_reason: DIRECT_BOX_FULFILLMENT_PENDING_REASON,
  };
}

/** Detect PostgREST / Postgres unknown-column errors for safe strip-retry. */
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

export function isDirectBoxFulfillmentAlreadyPending(row: {
  charge_blocked_reason?: string | null;
  fulfillment_dispatch_status?: string | null;
  fulfillment_channel?: string | null;
}): boolean {
  const reason = String(row.charge_blocked_reason ?? "").trim();
  if (reason === DIRECT_BOX_FULFILLMENT_PENDING_REASON) return true;
  const dispatch = String(row.fulfillment_dispatch_status ?? "")
    .trim()
    .toLowerCase();
  if (
    dispatch === DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING ||
    dispatch === "pending" ||
    dispatch === "pending_manual_handoff"
  ) {
    return true;
  }
  return false;
}
