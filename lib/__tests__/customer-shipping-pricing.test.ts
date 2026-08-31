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

describe("Customer shipping revenue pricing", () => {
  const configured = [
    {
      id: "1",
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

  it("pallet cost_cents=0 and last-mile=0 do not force free when rate configured", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: configured,
      legacy: {
        costCents: 0,
        bottleCapacity: 720,
        lastMileCostCentsPerBottle: 0,
        bottles: 6,
      },
    });
    expect(q.freeShipping).toBe(false);
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
    // linehaul 1000 + lastmile 833 = 1833 × 6
    expect(q.grossCents).toBe(1833 * 6);
  });

  it("inbound freight / capacity amortization is only in legacy path", () => {
    expect(
      legacyAmortizedShippingGrossCents({
        costCents: 426_263,
        bottleCapacity: 720,
        lastMileCostCentsPerBottle: 0,
        bottles: 6,
      }),
    ).toBe(Math.round(426_263 / 720) * 6);
  });

  it("flat fee is same for 6 and 12 bottles when configured flat", () => {
    const a = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: configured,
    });
    const b = resolveCustomerShippingQuote({
      bottleCount: 12,
      rates: configured,
    });
    expect(a.grossCents).toBe(b.grossCents);
  });

  it("allocates multi-reservation shipping with integer conservation", () => {
    const parts = allocateCustomerShippingByBottles(9900, [6, 6, 6, 6, 6]);
    expect(parts.reduce((s, x) => s + x, 0)).toBe(9900);
    expect(parts.length).toBe(5);
  });

  it("VAT net conversion for configured gross", () => {
    const q = resolveCustomerShippingQuote({
      bottleCount: 6,
      rates: configured,
      vatRate: 0.25,
    });
    expect(q.netCents).toBe(Math.round(9900 / 1.25));
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

  it("explicit free shipping + outbound reduces GM2", () => {
    const { gm2Cents } = deriveContributionMargins({
      productNetRevenueCents: 100_000,
      shippingRevenueNetCents: 0,
      purchaseCostCents: 40_000,
      exciseCents: 5_000,
      paymentFeeCents: 1_000,
      lastMileCostCents: 7_000,
      eprCents: 500,
      refundReserveCents: 1_000,
    });
    // GM1 = 55000; GM2 = 55000 + 0 - 1000 - 7000 - 500 - 1000 = 45500
    expect(gm2Cents).toBe(45_500);
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
