/**
 * Read-only shipping revenue audit helpers.
 * Does NOT rewrite frozen snapshots.
 */

import type { UnitEconomicsSnapshot } from "@/lib/pallet-contribution";

export type ShippingRevenueAuditRow = {
  reservationItemId: string;
  reservationId: string;
  quantity: number;
  shippingGrossCents: number;
  outboundCents: number;
  classification:
    | "ok"
    | "shipping_zero_with_outbound"
    | "missing_snapshot"
    | "legacy_backfill_suspect";
  reconstructable: boolean;
  notes: string;
};

export function classifyShippingRevenueOnSnapshot(input: {
  reservationItemId: string;
  reservationId: string;
  quantity: number;
  economicsSnapshot: unknown;
  /** Optional: reservation.shipping_revenue_gross_cents when column exists. */
  reservationShippingGrossCents?: number | null;
  /** Optional: reservation.total_sek for inference. */
  reservationTotalSek?: number | null;
  /** Optional: sum of product gross from sibling lines (öre). */
  reservationProductGrossCents?: number | null;
}): ShippingRevenueAuditRow {
  const qty = Math.max(0, Math.floor(input.quantity));
  const snap = input.economicsSnapshot;

  if (!snap || typeof snap !== "object") {
    return {
      reservationItemId: input.reservationItemId,
      reservationId: input.reservationId,
      quantity: qty,
      shippingGrossCents: 0,
      outboundCents: 0,
      classification: "missing_snapshot",
      reconstructable: false,
      notes: "No economics_snapshot",
    };
  }

  const s = snap as UnitEconomicsSnapshot;
  const shippingGross =
    (Number(s.unit_shipping_revenue_gross_cents) || 0) * qty;
  const outbound = (Number(s.unit_last_mile_cost_cents) || 0) * qty;

  if (shippingGross === 0 && outbound > 0) {
    // Reconstructable if reservation persisted shipping, or total − product implies shipping
    let reconstructable = false;
    let notes =
      "Shipping revenue 0 with positive outbound cost; do not invent actuals.";
    if (
      input.reservationShippingGrossCents != null &&
      Number(input.reservationShippingGrossCents) > 0
    ) {
      reconstructable = true;
      notes =
        "Reconstructable from order_reservations.shipping_revenue_gross_cents (persisted charge).";
    } else if (
      input.reservationTotalSek != null &&
      input.reservationProductGrossCents != null
    ) {
      const implied =
        Math.round(Number(input.reservationTotalSek) * 100) -
        Math.round(Number(input.reservationProductGrossCents));
      // Implied shipping after discounts is noisy — mark reconstructable only if clearly positive
      if (implied >= 500) {
        reconstructable = true;
        notes = `Possibly reconstructable from total_sek − product gross (implied ≈ ${implied} öre); verify discounts before backfill.`;
      }
    }

    return {
      reservationItemId: input.reservationItemId,
      reservationId: input.reservationId,
      quantity: qty,
      shippingGrossCents: shippingGross,
      outboundCents: outbound,
      classification: "shipping_zero_with_outbound",
      reconstructable,
      notes,
    };
  }

  return {
    reservationItemId: input.reservationItemId,
    reservationId: input.reservationId,
    quantity: qty,
    shippingGrossCents: shippingGross,
    outboundCents: outbound,
    classification: "ok",
    reconstructable: false,
    notes: "",
  };
}

export type ShippingAuditSummary = {
  scannedItems: number;
  affectedItems: number;
  affectedBottles: number;
  reconstructableItems: number;
  nonReconstructableItems: number;
};

export function summarizeShippingAudit(
  rows: ShippingRevenueAuditRow[],
): ShippingAuditSummary {
  let affectedItems = 0;
  let affectedBottles = 0;
  let reconstructableItems = 0;
  let nonReconstructableItems = 0;

  for (const r of rows) {
    if (r.classification === "shipping_zero_with_outbound") {
      affectedItems += 1;
      affectedBottles += r.quantity;
      if (r.reconstructable) reconstructableItems += 1;
      else nonReconstructableItems += 1;
    }
  }

  return {
    scannedItems: rows.length,
    affectedItems,
    affectedBottles,
    reconstructableItems,
    nonReconstructableItems,
  };
}
