/**
 * Shadow pallet contribution readiness (Phase 2).
 *
 * prePalletContribution = contribution BEFORE deducting inbound pallet freight.
 * Live ship-ready trigger remains min_bottles_to_complete (120) — this module
 * is observational only until a later phase.
 *
 * Snapshot at checkout confirm (same moment bottles enter PALLET_FILL_STATUSES).
 */

import {
  DEFAULT_VAT_RATE,
  type ContributionAssumptions,
  getContributionAssumptions,
} from "@/lib/contribution-assumptions";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import {
  computePalletShipProgress,
  resolveMinBottlesToShip,
  resolvePhysicalBottleCapacity,
} from "@/lib/pallet-ship-progress";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const ECONOMICS_SNAPSHOT_SCHEMA_VERSION = 2;

export type UnitEconomicsSnapshot = {
  schema_version: number;
  assumptions_version: string;
  currency: "SEK";
  unit_gross_revenue_cents: number;
  unit_net_revenue_cents: number;
  unit_discount_cents: number;
  unit_purchase_cost_cents: number;
  unit_excise_cents: number;
  unit_epr_cents: number;
  unit_payment_fee_cents: number;
  /**
   * Allocated outbound carrier cost (öre/bottle).
   * New checkouts: from outbound_freight_quotes allocation.
   * Legacy: last_mile_cost_cents_per_bottle estimate.
   */
  unit_last_mile_cost_cents: number;
  unit_shipping_revenue_gross_cents: number;
  unit_shipping_revenue_net_cents: number;
  unit_refund_reserve_cents: number;
  unit_pre_pallet_contribution_cents: number;
  vat_rate: number;
  price_includes_vat: boolean;
  /** Frozen FX used for purchase cost (1 for SEK). */
  purchase_fx_rate?: number | null;
  purchase_cost_currency?: string | null;
  /** When true, pre_pallet_contribution must not count toward economic readiness. */
  incomplete?: boolean;
  incomplete_reason?: string | null;
  outbound_quote_id?: string | null;
  outbound_cost_source?:
    | "outbound_quote"
    | "legacy_last_mile"
    | "incomplete"
    | null;
  outbound_provider_code?: string | null;
  outbound_service_name?: string | null;
  outbound_allocation_method?: "by_bottle_quantity" | null;
};

export type PalletContributionProgress = {
  bottlesFilled: number;
  bottlesWithSnapshot: number;

  accumulatedContributionCents: number;
  freightTargetCents: number;
  remainingContributionCents: number;

  freightFundedPercent: number;

  expectedContributionPerBottleCents: number | null;
  estimatedBottlesRemaining: number | null;

  isEconomicallyReady: boolean;
  currentBottleRuleReady: boolean;

  /** True when some fill-eligible bottles lack a snapshot (legacy). */
  hasIncompleteSnapshots: boolean;
};

export function grossToNetCents(
  grossCents: number,
  priceIncludesVat: boolean,
  vatRate: number = DEFAULT_VAT_RATE,
): number {
  const g = Math.round(Number(grossCents) || 0);
  if (!priceIncludesVat || vatRate <= 0) return g;
  return Math.round(g / (1 + vatRate));
}

/**
 * prePalletContribution per bottle (öre), before inbound pallet freight.
 *
 * net product revenue
 * + allocated net shipping revenue
 * − producer wine cost
 * − excise
 * − variable payment fee
 * − last-mile delivery cost
 * − EPR reserve
 * − refund/breakage reserve
 */
export function calculateUnitPrePalletContributionCents(input: {
  unitNetRevenueCents: number;
  unitShippingRevenueNetCents: number;
  unitPurchaseCostCents: number;
  unitExciseCents: number;
  unitPaymentFeeCents: number;
  unitLastMileCostCents: number;
  unitEprCents: number;
  unitRefundReserveCents: number;
}): number {
  return (
    Math.round(input.unitNetRevenueCents) +
    Math.round(input.unitShippingRevenueNetCents) -
    Math.round(input.unitPurchaseCostCents) -
    Math.round(input.unitExciseCents) -
    Math.round(input.unitPaymentFeeCents) -
    Math.round(input.unitLastMileCostCents) -
    Math.round(input.unitEprCents) -
    Math.round(input.unitRefundReserveCents)
  );
}

export function buildUnitEconomicsSnapshot(input: {
  unitGrossRevenueCents: number;
  unitDiscountCents: number;
  unitPurchaseCostCents: number;
  unitExciseCents: number;
  unitShippingRevenueGrossCents: number;
  unitLastMileCostCents: number;
  unitPaymentFeeCents: number;
  priceIncludesVat: boolean;
  assumptions?: ContributionAssumptions;
}): UnitEconomicsSnapshot {
  const assumptions = input.assumptions ?? getContributionAssumptions();
  const vatRate = assumptions.vatRate;
  const priceIncludesVat = input.priceIncludesVat !== false;

  const unitGross = Math.max(0, Math.round(input.unitGrossRevenueCents));
  const unitDiscount = Math.max(0, Math.round(input.unitDiscountCents));
  const unitNet = grossToNetCents(unitGross, priceIncludesVat, vatRate);
  const unitShipGross = Math.max(
    0,
    Math.round(input.unitShippingRevenueGrossCents),
  );
  const unitShipNet = grossToNetCents(unitShipGross, true, vatRate);
  const unitEpr = Math.max(0, Math.round(assumptions.eprCentsPerBottle));
  const unitRefund = Math.max(
    0,
    Math.round(unitNet * assumptions.refundBreakageReserveRate),
  );
  const unitPurchase = Math.max(0, Math.round(input.unitPurchaseCostCents));
  const unitExcise = Math.max(0, Math.round(input.unitExciseCents));
  const unitPaymentFee = Math.max(0, Math.round(input.unitPaymentFeeCents));
  const unitLastMile = Math.max(0, Math.round(input.unitLastMileCostCents));

  const unitContribution = calculateUnitPrePalletContributionCents({
    unitNetRevenueCents: unitNet,
    unitShippingRevenueNetCents: unitShipNet,
    unitPurchaseCostCents: unitPurchase,
    unitExciseCents: unitExcise,
    unitPaymentFeeCents: unitPaymentFee,
    unitLastMileCostCents: unitLastMile,
    unitEprCents: unitEpr,
    unitRefundReserveCents: unitRefund,
  });

  return {
    schema_version: ECONOMICS_SNAPSHOT_SCHEMA_VERSION,
    assumptions_version: assumptions.version,
    currency: "SEK",
    unit_gross_revenue_cents: unitGross,
    unit_net_revenue_cents: unitNet,
    unit_discount_cents: unitDiscount,
    unit_purchase_cost_cents: unitPurchase,
    unit_excise_cents: unitExcise,
    unit_epr_cents: unitEpr,
    unit_payment_fee_cents: unitPaymentFee,
    unit_last_mile_cost_cents: unitLastMile,
    unit_shipping_revenue_gross_cents: unitShipGross,
    unit_shipping_revenue_net_cents: unitShipNet,
    unit_refund_reserve_cents: unitRefund,
    unit_pre_pallet_contribution_cents: unitContribution,
    vat_rate: vatRate,
    price_includes_vat: priceIncludesVat,
  };
}

export function linePrePalletContributionCents(
  snapshot: UnitEconomicsSnapshot,
  quantity: number,
): number {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  return snapshot.unit_pre_pallet_contribution_cents * qty;
}

/**
 * When quantity changes after snapshot, rescale line contribution from frozen unit values.
 * Returns null if no usable snapshot (legacy row).
 */
export function rescalePrePalletContributionCents(
  economicsSnapshot: unknown,
  quantity: number,
): number | null {
  if (!economicsSnapshot || typeof economicsSnapshot !== "object") return null;
  const unit = (economicsSnapshot as UnitEconomicsSnapshot)
    .unit_pre_pallet_contribution_cents;
  if (unit == null || !Number.isFinite(Number(unit))) return null;
  return linePrePalletContributionCents(
    economicsSnapshot as UnitEconomicsSnapshot,
    quantity,
  );
}

export function resolveFreightTargetCents(pallet: {
  cost_cents?: number | null;
  freight_target_cents?: number | null;
  /** Frozen SEK öre from selected inbound freight quote (economically usable). */
  selected_inbound_freight_quote_total_sek_cents?: number | null;
}): number {
  // 1. Explicit manual override
  const override = Number(pallet.freight_target_cents);
  if (Number.isFinite(override) && override > 0) return Math.round(override);

  // 2. Selected inbound freight quote (shadow target)
  const quote = Number(pallet.selected_inbound_freight_quote_total_sek_cents);
  if (Number.isFinite(quote) && quote > 0) return Math.round(quote);

  // 3. Legacy pallet.cost_cents
  return Math.max(0, Math.round(Number(pallet.cost_cents) || 0));
}

/**
 * Pure progress calculator from already-aggregated inputs.
 */
export function computePalletContributionProgress(input: {
  bottlesFilled: number;
  bottlesWithSnapshot: number;
  accumulatedContributionCents: number;
  freightTargetCents: number;
  minBottlesToShip: number;
  physicalBottleCapacity?: number;
}): PalletContributionProgress {
  const bottlesFilled = Math.max(0, Math.floor(input.bottlesFilled));
  const bottlesWithSnapshot = Math.max(0, Math.floor(input.bottlesWithSnapshot));
  const accumulated = Math.round(input.accumulatedContributionCents);
  const freightTarget = Math.max(0, Math.round(input.freightTargetCents));
  const remaining = Math.max(0, freightTarget - accumulated);
  const freightFundedPercent =
    freightTarget <= 0
      ? accumulated > 0
        ? 100
        : 0
      : Math.round(Math.min(100, (accumulated / freightTarget) * 100) * 10) / 10;

  const expectedContributionPerBottleCents =
    bottlesWithSnapshot > 0
      ? Math.round(accumulated / bottlesWithSnapshot)
      : null;

  const estimatedBottlesRemaining =
    expectedContributionPerBottleCents != null &&
    expectedContributionPerBottleCents > 0
      ? Math.ceil(remaining / expectedContributionPerBottleCents)
      : null;

  const ship = computePalletShipProgress(
    bottlesFilled,
    resolveMinBottlesToShip(input.minBottlesToShip),
    resolvePhysicalBottleCapacity(input.physicalBottleCapacity ?? 720),
  );

  return {
    bottlesFilled,
    bottlesWithSnapshot,
    accumulatedContributionCents: accumulated,
    freightTargetCents: freightTarget,
    remainingContributionCents: remaining,
    freightFundedPercent,
    expectedContributionPerBottleCents,
    estimatedBottlesRemaining,
    isEconomicallyReady: freightTarget > 0 && accumulated >= freightTarget,
    currentBottleRuleReady: ship.isReadyToShip,
    hasIncompleteSnapshots: bottlesWithSnapshot < bottlesFilled,
  };
}

/**
 * Sum pre-pallet contribution for fill-eligible reservations on a pallet.
 * Same status population as {@link sumReservedBottlesOnPallet}.
 */
export async function getPalletContributionProgress(
  palletId: string,
  pallet: {
    cost_cents?: number | null;
    freight_target_cents?: number | null;
    bottle_capacity?: number | null;
    min_bottles_to_complete?: number | null;
    selected_inbound_freight_quote_id?: string | null;
  },
): Promise<PalletContributionProgress> {
  const sb = getSupabaseAdmin();

  let selectedQuoteSek: number | null = null;
  const quoteId = pallet.selected_inbound_freight_quote_id;
  if (quoteId) {
    const { data: quote } = await sb
      .from("pallet_freight_quotes")
      .select("total_cost_sek_cents, economically_usable, selected")
      .eq("id", quoteId)
      .maybeSingle();
    if (
      quote?.economically_usable === true &&
      quote.selected === true &&
      Number(quote.total_cost_sek_cents) > 0
    ) {
      selectedQuoteSek = Math.round(Number(quote.total_cost_sek_cents));
    }
  } else {
    const { data: selected } = await sb
      .from("pallet_freight_quotes")
      .select("total_cost_sek_cents, economically_usable")
      .eq("pallet_id", palletId)
      .eq("selected", true)
      .eq("economically_usable", true)
      .maybeSingle();
    if (selected && Number(selected.total_cost_sek_cents) > 0) {
      selectedQuoteSek = Math.round(Number(selected.total_cost_sek_cents));
    }
  }

  const freightTargetCents = resolveFreightTargetCents({
    ...pallet,
    selected_inbound_freight_quote_total_sek_cents: selectedQuoteSek,
  });

  const { data: reservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", palletId)
    .in("status", [...PALLET_FILL_STATUSES]);

  if (reservationsError || !reservations?.length) {
    return computePalletContributionProgress({
      bottlesFilled: 0,
      bottlesWithSnapshot: 0,
      accumulatedContributionCents: 0,
      freightTargetCents,
      minBottlesToShip: pallet.min_bottles_to_complete ?? 120,
      physicalBottleCapacity: pallet.bottle_capacity ?? 720,
    });
  }

  const reservationIds = reservations
    .map((r) => r.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const { data: items, error: itemsError } = await sb
    .from("order_reservation_items")
    .select("quantity, pre_pallet_contribution_cents")
    .in("reservation_id", reservationIds);

  if (itemsError || !items?.length) {
    return computePalletContributionProgress({
      bottlesFilled: 0,
      bottlesWithSnapshot: 0,
      accumulatedContributionCents: 0,
      freightTargetCents,
      minBottlesToShip: pallet.min_bottles_to_complete ?? 120,
      physicalBottleCapacity: pallet.bottle_capacity ?? 720,
    });
  }

  let bottlesFilled = 0;
  let bottlesWithSnapshot = 0;
  let accumulatedContributionCents = 0;

  for (const row of items) {
    const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
    bottlesFilled += qty;
    const contrib = row.pre_pallet_contribution_cents;
    if (contrib != null && Number.isFinite(Number(contrib))) {
      bottlesWithSnapshot += qty;
      accumulatedContributionCents += Math.round(Number(contrib));
    }
  }

  return computePalletContributionProgress({
    bottlesFilled,
    bottlesWithSnapshot,
    accumulatedContributionCents,
    freightTargetCents,
    minBottlesToShip: pallet.min_bottles_to_complete ?? 120,
    physicalBottleCapacity: pallet.bottle_capacity ?? 720,
  });
}
