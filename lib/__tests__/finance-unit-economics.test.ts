import { describe, expect, it } from "vitest";
import {
  aggregatePactActuals,
  allocateInboundFreightByBottles,
  buildFinanceBreakdown,
  calculateBreakEven,
  calculateUnitScenario,
  classifyShippingRevenueOnSnapshot,
  classifyUnitSnapshot,
  deriveGm3,
  inboundFreightCentsPerBottle,
  normalizeOpexCentsForPeriod,
  allocateOpexByChannel,
  percentOf,
  solveMaxPurchaseCost,
  solveRequiredRetailPrice,
  summarizeShippingAudit,
  type FinanceOpexEntry,
} from "@/lib/finance";
import { deriveContributionMargins } from "@/lib/admin-pallet-operating-summary";

/** Production 30-bottle pallet example (öre). */
const EXAMPLE = {
  productNet: 549_682,
  purchase: 430_120,
  excise: 66_570,
  shippingNet: 0,
  payment: 11_203,
  outbound: 34_500,
  epr: 1_500,
  refund: 5_493,
  inbound: 426_263,
};

describe("Finance GM1/GM2 regression (30-bottle pallet)", () => {
  it("matches known GM1 and GM2 from frozen product-side totals", () => {
    const { gm1Cents, gm2Cents } = deriveContributionMargins({
      productNetRevenueCents: EXAMPLE.productNet,
      shippingRevenueNetCents: EXAMPLE.shippingNet,
      purchaseCostCents: EXAMPLE.purchase,
      exciseCents: EXAMPLE.excise,
      paymentFeeCents: EXAMPLE.payment,
      lastMileCostCents: EXAMPLE.outbound,
      eprCents: EXAMPLE.epr,
      refundReserveCents: EXAMPLE.refund,
    });
    expect(gm1Cents).toBe(52_992);
    expect(percentOf(gm1Cents, EXAMPLE.productNet)).toBeCloseTo(9.6, 1);
    expect(gm2Cents).toBe(296);
    // 296 / 549682 ≈ 0.054% (UI often shows ~0.1% as a coarse label)
    expect(percentOf(gm2Cents, EXAMPLE.productNet)).toBeCloseTo(0.05, 2);
  });

  it("scenario: non-zero shipping revenue increases GM2", () => {
    const withShip = deriveContributionMargins({
      productNetRevenueCents: EXAMPLE.productNet,
      shippingRevenueNetCents: 40_000, // synthetic test-only
      purchaseCostCents: EXAMPLE.purchase,
      exciseCents: EXAMPLE.excise,
      paymentFeeCents: EXAMPLE.payment,
      lastMileCostCents: EXAMPLE.outbound,
      eprCents: EXAMPLE.epr,
      refundReserveCents: EXAMPLE.refund,
    });
    expect(withShip.gm2Cents).toBe(296 + 40_000);
  });

  it("GM3 forecast at ship qty 120 is deterministic", () => {
    const gm2 = 296;
    const perBottle = inboundFreightCentsPerBottle(EXAMPLE.inbound, 120);
    expect(perBottle).toBe(Math.floor(426_263 / 120)); // 3552
    // Scenario total GM3 for 30 bottles using per-bottle inbound at 120 fill:
    const inboundAllocatedTo30 = perBottle * 30;
    const gm3 = deriveGm3({
      gm2Cents: gm2,
      inboundFreightCents: inboundAllocatedTo30,
    });
    expect(gm3).toBe(296 - inboundAllocatedTo30);
  });

  it("does not present pre-ship 30-bottle state as realized full-pallet inbound", () => {
    // Actual inbound allocation kind should be forecast when not shipped
    const b = buildFinanceBreakdown({
      channel: "pact",
      mode: "scenario",
      bottles: 30,
      orders: 5,
      bottlesKnown: 30,
      bottlesIncomplete: 0,
      productGrossRevenueCents: 687_101,
      productNetRevenueCents: EXAMPLE.productNet,
      shippingGrossRevenueCents: 0,
      shippingNetRevenueCents: 0,
      discountCents: 0,
      producerPurchaseCostCents: EXAMPLE.purchase,
      alcoholExciseCents: EXAMPLE.excise,
      paymentFeesCents: EXAMPLE.payment,
      outboundCarrierCostCents: EXAMPLE.outbound,
      eprCents: EXAMPLE.epr,
      refundBreakageReserveCents: EXAMPLE.refund,
      inboundFreightCents: inboundFreightCentsPerBottle(EXAMPLE.inbound, 120) * 30,
      inboundAllocationKind: "forecast",
      opexAllocatedCents: 0,
      completeness: "partial",
      warnings: [],
    });
    expect(b.inboundAllocationKind).toBe("forecast");
    expect(b.gm2Cents).toBe(296);
  });
});

describe("Inbound allocation", () => {
  it("allocates by bottle weights with integer conservation", () => {
    const parts = allocateInboundFreightByBottles(1000, [3, 3, 4]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

describe("Solvers", () => {
  const base = {
    priceIncludesVat: true,
    vatRate: 0.25,
    bottlesPerOrder: 6,
    purchaseCostCentsPerBottle: 14_337, // ~143.37 SEK
    purchaseCostCurrency: "SEK",
    purchaseFxRate: 1,
    exciseCentsPerBottle: 2_219,
    eprCentsPerBottle: 50,
    refundBreakageReserveRate: 0.01,
    stripeFeePercent: 0.015,
    stripeFeeFixedCentsPerOrder: 180,
    shippingRevenueGrossCentsPerOrder: 10_000,
    shippingPriceIncludesVat: true,
    outboundCarrierCostCentsPerOrder: 6_900,
    inboundFreightTotalCents: 426_263,
    assumedShipQuantity: 240,
  };

  it("solves required retail for target GM1 %", () => {
    const r = solveRequiredRetailPrice({
      targetKind: "gm1_percent",
      target: 30,
      assumptions: base,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiredRetailMajor).toBeGreaterThan(0);
    const pct = percentOf(r.gm1Cents, r.requiredNetCentsPerBottle);
    expect(pct).toBeGreaterThanOrEqual(30);
  });

  it("solves max producer cost for target GM1", () => {
    const r = solveMaxPurchaseCost({
      sellingPriceMajor: 299,
      targetKind: "gm1_percent",
      target: 20,
      assumptions: base,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.maxPurchaseCostCentsSek).toBeGreaterThan(0);
    expect(r.currency).toBe("SEK");
  });

  it("unknown FX fails closed", () => {
    const r = solveRequiredRetailPrice({
      targetKind: "gm1_percent",
      target: 20,
      assumptions: {
        ...base,
        purchaseCostCurrency: "EUR",
        purchaseFxRate: null,
        purchaseCostCentsPerBottle: 1000,
      },
    });
    expect(r.ok).toBe(false);
  });
});

describe("Unit scenario", () => {
  it("computes price sensitivity deltas", () => {
    const baseInput = {
      priceIncludesVat: true,
      vatRate: 0.25,
      bottles: 100,
      bottlesPerOrder: 6,
      purchaseCostCentsPerBottle: 14_337,
      purchaseCostCurrency: "SEK",
      purchaseFxRate: 1,
      exciseCentsPerBottle: 2_219,
      eprCentsPerBottle: 50,
      refundBreakageReserveRate: 0.01,
      stripeFeePercent: 0.015,
      stripeFeeFixedCentsPerOrder: 180,
      shippingRevenueGrossCentsPerOrder: 10_000,
      shippingPriceIncludesVat: true,
      outboundCarrierCostCentsPerOrder: 6_900,
      inboundFreightTotalCents: 426_263,
      assumedShipQuantity: 240,
    };
    const low = calculateUnitScenario({
      ...baseInput,
      sellingPriceMajor: 229,
    });
    const high = calculateUnitScenario({
      ...baseInput,
      sellingPriceMajor: 259,
    });
    expect(high.gm1CentsPerBottle).toBeGreaterThan(low.gm1CentsPerBottle);
  });
});

describe("OpEx + break-even", () => {
  const entries: FinanceOpexEntry[] = [
    {
      id: "1",
      name: "Payroll",
      category: "payroll",
      amountCents: 8_000_000,
      currency: "SEK",
      cadence: "monthly",
      channel: "shared",
      sharedPactPercent: 70,
      startsOn: "2026-01-01",
      endsOn: null,
      active: true,
      notes: null,
    },
    {
      id: "2",
      name: "Software",
      category: "software",
      amountCents: 1_020_000,
      currency: "SEK",
      cadence: "annual",
      channel: "pact",
      sharedPactPercent: null,
      startsOn: "2026-01-01",
      endsOn: null,
      active: true,
      notes: null,
    },
  ];

  it("normalizes monthly and annual into period", () => {
    const period = {
      start: new Date(Date.UTC(2026, 7, 1)),
      end: new Date(Date.UTC(2026, 7, 31)),
    };
    const monthly = normalizeOpexCentsForPeriod(entries[0]!, period);
    expect(monthly).toBeGreaterThan(7_000_000);
    expect(monthly).toBeLessThan(9_000_000);
  });

  it("allocates shared OpEx by percent", () => {
    const period = {
      start: new Date(Date.UTC(2026, 7, 1)),
      end: new Date(Date.UTC(2026, 7, 31)),
    };
    const pact = allocateOpexByChannel(entries, period, "pact");
    const dirty = allocateOpexByChannel(entries, period, "dirtywine");
    expect(pact.allocatedCents).toBeGreaterThan(dirty.allocatedCents);
  });

  it("shared without allocation stays unallocated for channel filter", () => {
    const period = {
      start: new Date(Date.UTC(2026, 7, 1)),
      end: new Date(Date.UTC(2026, 7, 31)),
    };
    const e: FinanceOpexEntry[] = [
      {
        ...entries[0]!,
        sharedPactPercent: null,
      },
    ];
    const pact = allocateOpexByChannel(e, period, "pact");
    expect(pact.allocatedCents).toBe(0);
    expect(pact.sharedUnallocatedCents).toBeGreaterThan(0);
  });

  it("break-even requires positive GM3", () => {
    expect(
      calculateBreakEven({
        opexCents: 100_000,
        gm3CentsPerBottle: 0,
        gm3PercentOfProductNet: 0,
      }).ok,
    ).toBe(false);
    const ok = calculateBreakEven({
      opexCents: 100_000,
      gm3CentsPerBottle: 500,
      gm3PercentOfProductNet: 10,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.bottlesRequired).toBe(200);
  });
});

describe("Completeness + shipping audit", () => {
  it("flags shipping zero with outbound", () => {
    const c = classifyUnitSnapshot(
      {
        schema_version: 2,
        unit_shipping_revenue_gross_cents: 0,
        unit_last_mile_cost_cents: 1150,
        incomplete: false,
      },
      6,
    );
    expect(c.warnings.some((w) => w.code === "shipping_zero_with_outbound")).toBe(
      true,
    );
  });

  it("summarizes shipping audit without rewriting", () => {
    const row = classifyShippingRevenueOnSnapshot({
      reservationItemId: "i1",
      reservationId: "r1",
      quantity: 6,
      economicsSnapshot: {
        unit_shipping_revenue_gross_cents: 0,
        unit_last_mile_cost_cents: 1000,
      },
    });
    const summary = summarizeShippingAudit([row]);
    expect(summary.affectedItems).toBe(1);
    expect(summary.reconstructableItems).toBe(0);
  });
});

describe("aggregatePactActuals", () => {
  it("excludes incomplete snapshots from known margins", () => {
    const b = aggregatePactActuals({
      orderCount: 1,
      rows: [
        {
          quantity: 2,
          economics_snapshot: {
            schema_version: 2,
            unit_gross_revenue_cents: 10000,
            unit_net_revenue_cents: 8000,
            unit_discount_cents: 0,
            unit_shipping_revenue_gross_cents: 0,
            unit_shipping_revenue_net_cents: 0,
            unit_purchase_cost_cents: 3000,
            unit_excise_cents: 500,
            unit_payment_fee_cents: 200,
            unit_last_mile_cost_cents: 100,
            unit_epr_cents: 50,
            unit_refund_reserve_cents: 80,
            unit_pre_pallet_contribution_cents: 4070,
            incomplete: false,
          },
        },
        {
          quantity: 1,
          economics_snapshot: {
            schema_version: 2,
            unit_net_revenue_cents: 8000,
            incomplete: true,
            incomplete_reason: "Missing FX",
            unit_gross_revenue_cents: 10000,
            unit_discount_cents: 0,
            unit_shipping_revenue_gross_cents: 0,
            unit_shipping_revenue_net_cents: 0,
            unit_purchase_cost_cents: 0,
            unit_excise_cents: 0,
            unit_payment_fee_cents: 0,
            unit_last_mile_cost_cents: 0,
            unit_epr_cents: 0,
            unit_refund_reserve_cents: 0,
            unit_pre_pallet_contribution_cents: 0,
          },
        },
      ],
    });
    expect(b.bottlesKnown).toBe(2);
    expect(b.bottlesIncomplete).toBe(1);
    expect(b.gm1Cents).toBe((8000 - 3000 - 500) * 2);
  });
});
