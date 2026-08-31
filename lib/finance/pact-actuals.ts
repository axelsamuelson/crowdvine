/**
 * Aggregate frozen PACT snapshots into FinanceBreakdown lines.
 */

import {
  aggregateContributionEconomicsBreakdown,
} from "@/lib/admin-pallet-operating-summary";
import { buildFinanceBreakdown } from "@/lib/finance/margins";
import { classifyUnitSnapshot } from "@/lib/finance/completeness";
import type { FinanceBreakdown, FinanceWarning } from "@/lib/finance/types";

export type PactSnapshotRow = {
  quantity: number | null;
  economics_snapshot: unknown;
  reservation_id?: string;
};

/**
 * Roll up PACT frozen snapshots.
 *
 * Policy: margin totals (GM1–GM3 inputs) include only non-incomplete snapshots.
 * Incomplete / missing bottles are counted separately and surfaced in coverage.
 * Shipping-zero-with-outbound rows are still included in margins (historical truth)
 * but emit warnings.
 */
export function aggregatePactActuals(input: {
  rows: PactSnapshotRow[];
  orderCount: number;
  inboundFreightCents?: number;
  inboundAllocationKind?: FinanceBreakdown["inboundAllocationKind"];
  opexAllocatedCents?: number;
}): FinanceBreakdown {
  const knownRows: PactSnapshotRow[] = [];
  const warnings: FinanceWarning[] = [];
  let bottles = 0;
  let bottlesKnown = 0;
  let bottlesIncomplete = 0;

  for (const row of input.rows) {
    const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
    bottles += qty;
    const c = classifyUnitSnapshot(row.economics_snapshot, qty);
    for (const w of c.warnings) {
      if (!warnings.some((x) => x.code === w.code && x.message === w.message)) {
        warnings.push(w);
      }
    }
    if (!row.economics_snapshot || typeof row.economics_snapshot !== "object") {
      bottlesIncomplete += qty;
      continue;
    }
    if (!c.includeInKnownMargins) {
      bottlesIncomplete += qty;
      continue;
    }
    bottlesKnown += qty;
    knownRows.push(row);
  }

  const agg = aggregateContributionEconomicsBreakdown(knownRows);

  let completeness: FinanceBreakdown["completeness"] = "complete";
  if (bottlesIncomplete > 0 && bottlesKnown === 0) completeness = "missing";
  else if (bottlesIncomplete > 0) completeness = "partial";
  else if (warnings.some((w) => w.code === "legacy_snapshot")) {
    completeness = "legacy";
  } else if (warnings.length > 0) {
    completeness = "partial";
  }

  return buildFinanceBreakdown({
    channel: "pact",
    mode: "actuals",
    bottles,
    orders: input.orderCount,
    bottlesKnown,
    bottlesIncomplete,
    productGrossRevenueCents: agg.productGrossRevenueCents,
    productNetRevenueCents: agg.productNetRevenueCents,
    shippingGrossRevenueCents: agg.shippingRevenueGrossCents,
    shippingNetRevenueCents: agg.shippingRevenueNetCents,
    discountCents: agg.discountCents,
    producerPurchaseCostCents: agg.purchaseCostCents,
    alcoholExciseCents: agg.exciseCents,
    paymentFeesCents: agg.paymentFeeCents,
    outboundCarrierCostCents: agg.lastMileCostCents,
    eprCents: agg.eprCents,
    refundBreakageReserveCents: agg.refundReserveCents,
    inboundFreightCents: input.inboundFreightCents ?? 0,
    inboundAllocationKind: input.inboundAllocationKind ?? "none",
    opexAllocatedCents: input.opexAllocatedCents ?? 0,
    completeness,
    warnings,
  });
}
