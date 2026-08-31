import { describe, expect, it } from "vitest";
import {
  allocateCustomerShippingByBottles,
  legacyAmortizedShippingGrossCents,
  resolveCustomerShippingQuote,
} from "@/lib/customer-shipping-pricing";
import { classifyUnitSnapshot } from "@/lib/finance/completeness";
import { deriveContributionMargins } from "@/lib/admin-pallet-operating-summary";
import {
  classifyHistoricalShippingRow,
  summarizeHistoricalShippingAudit,
} from "@/lib/finance/historical-shipping-audit";
import { computePalletShipProgress } from "@/lib/pallet-ship-progress";
import { grossToNetCents } from "@/lib/pallet-contribution";
import { buildReservationItemEconomicsRows } from "@/lib/reservation-economics-snapshot";

/** Authorized PACT Sweden production rate: 99 SEK inkl moms / order. */
const PACT_SE_99 = [
  {
    id: "a0610408-3daf-44b4-8e9b-a2c5f74de2d4",
    channel: "pact" as const,
    countryCode: "SE",
    flatFeeCents: 9900,
    freeShipping: false,
    freeShippingThresholdCents: null,
    minBottles: null,
    maxBottles: null,
    active: true,
    validFrom: null,
    validTo: null,
  },
];

const legacyZero = {
  costCents: 0,
  bottleCapacity: 720,
  lastMileCostCentsPerBottle: 0,
  bottles: 6,
};

describe("PACT Sweden 99 SEK per order (authorized)", () => {
  for (const bottles of [1, 6, 12] as const) {
    it(`${bottles} bottle(s) → 9900 öre (per order, not per bottle)`, () => {
      const q = resolveCustomerShippingQuote({
        bottleCount: bottles,
        countryCode: "SE",
        rates: PACT_SE_99,
        allowLegacyFallback: true,
        legacy: { ...legacyZero, bottles },
      });
      expect(q.grossCents).toBe(9900);
      expect(q.source).toBe("configured_flat");
      expect(q.complete).toBe(true);
      expect(q.freeShipping).toBe(false);
    });
  }

  it("NULL free-shipping threshold is not free shipping", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: PACT_SE_99,
      productSubtotalGrossCents: 1_000_000,
    });
    expect(q.grossCents).toBe(9900);
    expect(q.freeShipping).toBe(false);
  });

  it("configured rate bypasses legacy when cost_cents and last-mile are 0", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: PACT_SE_99,
      allowLegacyFallback: true,
      legacy: legacyZero,
    });
    expect(q.source).toBe("configured_flat");
    expect(q.grossCents).toBe(9900);
    expect(legacyAmortizedShippingGrossCents(legacyZero)).toBe(0);
  });

  it("inbound freight amount has zero effect on configured customer charge", () => {
    const a = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: PACT_SE_99,
      legacy: {
        costCents: 0,
        bottleCapacity: 720,
        lastMileCostCentsPerBottle: 0,
        bottles: 6,
      },
    });
    const b = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: PACT_SE_99,
      legacy: {
        costCents: 426_263,
        bottleCapacity: 720,
        lastMileCostCentsPerBottle: 0,
        bottles: 6,
      },
    });
    expect(a.grossCents).toBe(9900);
    expect(b.grossCents).toBe(9900);
  });

  it("VAT 25%: 9900 gross → 7920 net", () => {
    expect(grossToNetCents(9900, true, 0.25)).toBe(7920);
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: PACT_SE_99,
      vatRate: 0.25,
    });
    expect(q.netCents).toBe(7920);
  });
});

describe("Customer shipping revenue pricing", () => {
  const configured = PACT_SE_99;

  it("uses configured flat fee independent of pallet cost_cents", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: configured,
      allowLegacyFallback: true,
      legacy: {
        costCents: 0,
        bottleCapacity: 720,
        lastMileCostCentsPerBottle: 0,
        bottles: 6,
      },
    });
    expect(q.complete).toBe(true);
    expect(q.source).toBe("configured_flat");
    expect(q.grossCents).toBe(9900);
  });

  it("explicit free shipping is complete with zero", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: [
        {
          ...configured[0]!,
          freeShipping: true,
          flatFeeCents: 0,
        },
      ],
    });
    expect(q.source).toBe("configured_free");
    expect(q.grossCents).toBe(0);
    expect(q.complete).toBe(true);
    expect(q.freeShipping).toBe(true);
  });

  it("missing config without legacy is incomplete (not silent free)", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: [],
      allowLegacyFallback: false,
    });
    expect(q.source).toBe("missing_config");
    expect(q.complete).toBe(false);
    expect(q.freeShipping).toBe(false);
  });

  it("legacy fallback still works when no rate configured", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: [],
      allowLegacyFallback: true,
      legacy: {
        costCents: 720_000,
        bottleCapacity: 720,
        lastMileCostCentsPerBottle: 833,
        bottles: 6,
      },
    });
    expect(q.source).toBe("legacy_pallet_amortization");
    expect(q.complete).toBe(false);
    expect(q.grossCents).toBe(1833 * 6);
  });

  it("uneven multi-reservation split still sums to 9900", () => {
    const parts = allocateCustomerShippingByBottles(9900, [2, 3, 7]);
    expect(parts.reduce((s, x) => s + x, 0)).toBe(9900);
    expect(parts).not.toEqual([9900, 9900, 9900]);
  });

  it("equal five-way split sums to 9900", () => {
    const parts = allocateCustomerShippingByBottles(9900, [6, 6, 6, 6, 6]);
    expect(parts.reduce((s, x) => s + x, 0)).toBe(9900);
    expect(parts.every((p) => p === 1980)).toBe(true);
  });
});

describe("Snapshot reconciliation + synthetic GM2 with 99 SEK shipping", () => {
  it("6-bottle snapshot shipping totals 9900 gross / 7920 net", () => {
    const rows = buildReservationItemEconomicsRows({
      reservationId: "r1",
      lines: [{ merchandiseId: "w1", quantity: 6, lineTotalSek: 1374.2 }],
      wineById: new Map([
        [
          "w1",
          {
            cost_amount: 14.337,
            cost_currency: "SEK",
            exchange_rate: 1,
            alcohol_tax_cents: 2219,
            price_includes_vat: true,
          },
        ],
      ]),
      orderLevelDiscountCents: 0,
      shippingRevenueGrossCents: 9900,
      outbound: { mode: "legacy_last_mile", lastMileCostCentsPerBottle: 0 },
      paymentFeeFixedCents: 180,
      rateMap: {},
    });
    const snap = rows[0]!.economics_snapshot;
    const qty = rows[0]!.quantity;
    expect(snap.unit_shipping_revenue_gross_cents * qty).toBe(9900);
    expect(snap.unit_shipping_revenue_net_cents * qty).toBe(7920);
  });

  it("historical GM2 stays 296; synthetic five×99 SEK shipping → 39896", () => {
    const historical = deriveContributionMargins({
      productNetRevenueCents: 549_682,
      shippingRevenueNetCents: 0,
      purchaseCostCents: 430_120,
      exciseCents: 66_570,
      paymentFeeCents: 11_203,
      lastMileCostCents: 34_500,
      eprCents: 1_500,
      refundReserveCents: 5_493,
    });
    expect(historical.gm1Cents).toBe(52_992);
    expect(historical.gm2Cents).toBe(296);

    expect(grossToNetCents(49_500, true, 0.25)).toBe(39_600);
    const synthetic = deriveContributionMargins({
      productNetRevenueCents: 549_682,
      shippingRevenueNetCents: 39_600,
      purchaseCostCents: 430_120,
      exciseCents: 66_570,
      paymentFeeCents: 11_203,
      lastMileCostCents: 34_500,
      eprCents: 1_500,
      refundReserveCents: 5_493,
    });
    expect(synthetic.gm2Cents).toBe(39_896);
  });
});

describe("Shipping vs carrier cost separation", () => {
  it("nonzero shipping revenue increases GM2; outbound stays separate", () => {
    const base = {
      productNetRevenueCents: 549_682,
      purchaseCostCents: 430_120,
      exciseCents: 66_570,
      paymentFeeCents: 11_203,
      lastMileCostCents: 34_500,
      eprCents: 1_500,
      refundReserveCents: 5_493,
    };
    const zeroShip = deriveContributionMargins({
      ...base,
      shippingRevenueNetCents: 0,
    });
    const withShip = deriveContributionMargins({
      ...base,
      shippingRevenueNetCents: 40_000,
    });
    expect(zeroShip.gm2Cents).toBe(296);
    expect(withShip.gm2Cents).toBe(296 + 40_000);
  });
});

describe("Historical ambiguity", () => {
  it("flags ambiguous zero with outbound", () => {
    const c = classifyUnitSnapshot(
      {
        schema_version: 2,
        unit_shipping_revenue_gross_cents: 0,
        unit_last_mile_cost_cents: 1150,
        incomplete: false,
      },
      6,
    );
    expect(
      c.warnings.some((w) => w.code === "legacy_shipping_revenue_ambiguous"),
    ).toBe(true);
  });

  it("summarizes reconstructability classes", () => {
    const rows = [
      classifyHistoricalShippingRow({
        reservationId: "a",
        bottles: 6,
        snapshotShippingGrossCents: 7900,
        reservationShippingGrossCents: null,
        outboundCostCents: 6900,
      }),
      classifyHistoricalShippingRow({
        reservationId: "b",
        bottles: 6,
        snapshotShippingGrossCents: 0,
        reservationShippingGrossCents: null,
        outboundCostCents: 6900,
      }),
    ];
    const s = summarizeHistoricalShippingAudit(rows);
    expect(s.reconstructable).toBe(1);
    expect(s.ambiguousZero).toBe(1);
  });
});

describe("Readiness regression", () => {
  it("120/720 readiness unchanged", () => {
    const p = computePalletShipProgress(30, 120, 720);
    expect(p.isReadyToShip).toBe(false);
    expect(p.shipProgressPercent).toBe(25);
    expect(p.physicalBottleCapacity).toBe(720);
  });
});
