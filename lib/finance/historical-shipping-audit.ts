/**
 * Read-only historical customer shipping reconstructability classifier.
 * Does NOT mutate snapshots or reservations.
 */

export type HistoricalShippingClass =
  | "snapshot_shipping_present"
  | "reservation_shipping_present"
  | "known_free_shipping"
  | "legacy_zero_ambiguous"
  | "not_reconstructable";

export type HistoricalShippingAuditRow = {
  reservationId: string;
  classification: HistoricalShippingClass;
  snapshotShippingGrossCents: number;
  reservationShippingGrossCents: number | null;
  outboundCostCents: number;
  bottles: number;
};

export function classifyHistoricalShippingRow(input: {
  reservationId: string;
  bottles: number;
  /** Sum of unit_shipping_revenue_gross_cents × qty from items. */
  snapshotShippingGrossCents: number;
  reservationShippingGrossCents: number | null;
  outboundCostCents: number;
  /** Explicit configured free on modern rows (reservation shipping 0 + complete flag). */
  explicitFreeShipping?: boolean;
}): HistoricalShippingAuditRow {
  const snapShip = Math.max(0, Math.round(input.snapshotShippingGrossCents));
  const resShip =
    input.reservationShippingGrossCents == null
      ? null
      : Math.max(0, Math.round(input.reservationShippingGrossCents));
  const outbound = Math.max(0, Math.round(input.outboundCostCents));

  if (resShip != null && resShip > 0) {
    return {
      reservationId: input.reservationId,
      classification: "reservation_shipping_present",
      snapshotShippingGrossCents: snapShip,
      reservationShippingGrossCents: resShip,
      outboundCostCents: outbound,
      bottles: input.bottles,
    };
  }

  if (snapShip > 0) {
    return {
      reservationId: input.reservationId,
      classification: "snapshot_shipping_present",
      snapshotShippingGrossCents: snapShip,
      reservationShippingGrossCents: resShip,
      outboundCostCents: outbound,
      bottles: input.bottles,
    };
  }

  if (input.explicitFreeShipping === true || (resShip === 0 && outbound === 0)) {
    return {
      reservationId: input.reservationId,
      classification: "known_free_shipping",
      snapshotShippingGrossCents: snapShip,
      reservationShippingGrossCents: resShip,
      outboundCostCents: outbound,
      bottles: input.bottles,
    };
  }

  if (snapShip === 0 && outbound > 0) {
    return {
      reservationId: input.reservationId,
      classification: "legacy_zero_ambiguous",
      snapshotShippingGrossCents: snapShip,
      reservationShippingGrossCents: resShip,
      outboundCostCents: outbound,
      bottles: input.bottles,
      };
  }

  return {
    reservationId: input.reservationId,
    classification: "not_reconstructable",
    snapshotShippingGrossCents: snapShip,
    reservationShippingGrossCents: resShip,
    outboundCostCents: outbound,
    bottles: input.bottles,
  };
}

export function summarizeHistoricalShippingAudit(
  rows: HistoricalShippingAuditRow[],
): Record<HistoricalShippingClass, number> & {
  total: number;
  reconstructable: number;
  ambiguousZero: number;
  notReconstructable: number;
} {
  const counts: Record<HistoricalShippingClass, number> = {
    snapshot_shipping_present: 0,
    reservation_shipping_present: 0,
    known_free_shipping: 0,
    legacy_zero_ambiguous: 0,
    not_reconstructable: 0,
  };
  for (const r of rows) counts[r.classification] += 1;
  return {
    ...counts,
    total: rows.length,
    reconstructable:
      counts.snapshot_shipping_present + counts.reservation_shipping_present,
    ambiguousZero: counts.legacy_zero_ambiguous,
    notReconstructable: counts.not_reconstructable,
  };
}
