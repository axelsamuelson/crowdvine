import { describe, it, expect } from "vitest";
import {
  buildUnitEconomicsSnapshot,
  calculateUnitPrePalletContributionCents,
  computePalletContributionProgress,
  grossToNetCents,
  resolveFreightTargetCents,
} from "../pallet-contribution";
import {
  allocatePoolByWeights,
  buildReservationItemEconomicsRows,
} from "../reservation-economics-snapshot";
import {
  CONTRIBUTION_ASSUMPTIONS_VERSION,
  getContributionAssumptions,
} from "../contribution-assumptions";

describe("contribution assumptions", () => {
  it("loads documented defaults", () => {
    const a = getContributionAssumptions({});
    expect(a.version).toBe(CONTRIBUTION_ASSUMPTIONS_VERSION);
    expect(a.stripeFeePercent).toBe(0.015);
    expect(a.stripeFeeFixedCents).toBe(180);
    expect(a.refundBreakageReserveRate).toBe(0.01);
    expect(a.eprCentsPerBottle).toBe(50);
  });

  it("allows env overrides", () => {
    const a = getContributionAssumptions({
      CONTRIBUTION_STRIPE_FEE_PERCENT: "0.02",
      CONTRIBUTION_EPR_CENTS_PER_BOTTLE: "75",
    } as NodeJS.ProcessEnv);
    expect(a.stripeFeePercent).toBe(0.02);
    expect(a.eprCentsPerBottle).toBe(75);
  });
});

describe("pre-pallet contribution formula", () => {
  it("converts gross inkl moms to net", () => {
    expect(grossToNetCents(12500, true, 0.25)).toBe(10000);
    expect(grossToNetCents(10000, false, 0.25)).toBe(10000);
  });

  it("does not deduct inbound pallet freight", () => {
    const unit = calculateUnitPrePalletContributionCents({
      unitNetRevenueCents: 10000,
      unitShippingRevenueNetCents: 800,
      unitPurchaseCostCents: 4000,
      unitExciseCents: 2219,
      unitPaymentFeeCents: 200,
      unitLastMileCostCents: 833,
      unitEprCents: 50,
      unitRefundReserveCents: 100,
    });
    // 10000 + 800 - 4000 - 2219 - 200 - 833 - 50 - 100
    expect(unit).toBe(3398);
  });

  it("builds a frozen unit snapshot", () => {
    const snap = buildUnitEconomicsSnapshot({
      unitGrossRevenueCents: 25000,
      unitDiscountCents: 0,
      unitPurchaseCostCents: 5000,
      unitExciseCents: 2219,
      unitShippingRevenueGrossCents: 1317,
      unitLastMileCostCents: 833,
      unitPaymentFeeCents: 375 + 30,
      priceIncludesVat: true,
      assumptions: getContributionAssumptions({}),
    });
    expect(snap.unit_net_revenue_cents).toBe(20000);
    expect(snap.unit_epr_cents).toBe(50);
    expect(snap.unit_refund_reserve_cents).toBe(200);
    expect(snap.unit_pre_pallet_contribution_cents).toBe(
      calculateUnitPrePalletContributionCents({
        unitNetRevenueCents: snap.unit_net_revenue_cents,
        unitShippingRevenueNetCents: snap.unit_shipping_revenue_net_cents,
        unitPurchaseCostCents: snap.unit_purchase_cost_cents,
        unitExciseCents: snap.unit_excise_cents,
        unitPaymentFeeCents: snap.unit_payment_fee_cents,
        unitLastMileCostCents: snap.unit_last_mile_cost_cents,
        unitEprCents: snap.unit_epr_cents,
        unitRefundReserveCents: snap.unit_refund_reserve_cents,
      }),
    );
  });
});

describe("pallet contribution progress (shadow)", () => {
  it("reports economic ready separately from bottle rule", () => {
    const p = computePalletContributionProgress({
      bottlesFilled: 60,
      bottlesWithSnapshot: 60,
      accumulatedContributionCents: 450_000,
      freightTargetCents: 418_500,
      minBottlesToShip: 120,
      physicalBottleCapacity: 720,
    });
    expect(p.isEconomicallyReady).toBe(true);
    expect(p.currentBottleRuleReady).toBe(false);
    expect(p.freightFundedPercent).toBe(100);
    expect(p.estimatedBottlesRemaining).toBe(0);
  });

  it("estimates bottles remaining from average contribution", () => {
    const p = computePalletContributionProgress({
      bottlesFilled: 30,
      bottlesWithSnapshot: 30,
      accumulatedContributionCents: 90_000,
      freightTargetCents: 418_500,
      minBottlesToShip: 120,
      physicalBottleCapacity: 720,
    });
    expect(p.expectedContributionPerBottleCents).toBe(3000);
    expect(p.remainingContributionCents).toBe(328_500);
    expect(p.estimatedBottlesRemaining).toBe(Math.ceil(328_500 / 3000));
    expect(p.currentBottleRuleReady).toBe(false);
    expect(p.isEconomicallyReady).toBe(false);
  });

  it("flags incomplete snapshots for legacy rows", () => {
    const p = computePalletContributionProgress({
      bottlesFilled: 40,
      bottlesWithSnapshot: 10,
      accumulatedContributionCents: 50_000,
      freightTargetCents: 418_500,
      minBottlesToShip: 120,
    });
    expect(p.hasIncompleteSnapshots).toBe(true);
  });

  it("uses freight_target_cents override when set", () => {
    expect(
      resolveFreightTargetCents({ cost_cents: 1000, freight_target_cents: 5000 }),
    ).toBe(5000);
    expect(resolveFreightTargetCents({ cost_cents: 418_500 })).toBe(418_500);
  });
});

describe("reservation economics snapshot builder", () => {
  it("allocates pools by weight with largest remainder", () => {
    expect(allocatePoolByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("builds item rows with line contribution totals", () => {
    const rows = buildReservationItemEconomicsRows({
      reservationId: "res-1",
      lines: [
        { merchandiseId: "w1", quantity: 6, lineTotalSek: 1500 },
      ],
      wineById: new Map([
        [
          "w1",
          {
            cost_amount: 40,
            cost_currency: "SEK",
            exchange_rate: 1,
            alcohol_tax_cents: 2219,
            price_includes_vat: true,
          },
        ],
      ]),
      orderLevelDiscountCents: 0,
      shippingRevenueGrossCents: 7900,
      lastMileCostCentsPerBottle: 833,
      paymentFeeFixedCents: 180,
      assumptions: getContributionAssumptions({}),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.quantity).toBe(6);
    expect(rows[0]!.economics_snapshot.unit_gross_revenue_cents).toBe(25000);
    expect(rows[0]!.pre_pallet_contribution_cents).toBe(
      rows[0]!.economics_snapshot.unit_pre_pallet_contribution_cents * 6,
    );
  });
});
