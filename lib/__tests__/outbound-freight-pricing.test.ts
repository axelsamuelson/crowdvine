import { describe, it, expect } from "vitest";
import {
  budbeeLightSwedenRateCard,
  calculateOutboundFreightQuoteBreakdown,
  isRemoteAreaBlockedForCountry,
  priceParcelIncrementalWeightCents,
  resolveParcelCount,
  roundUpToHalfKg,
  volumetricWeightKgFromMeters,
} from "../outbound-freight-pricing";
import {
  allocatePoolByWeights,
  buildReservationItemEconomicsRows,
} from "../reservation-economics-snapshot";
import { getContributionAssumptions } from "../contribution-assumptions";
import { computePalletShipProgress } from "../pallet-ship-progress";

describe("volumetric weight + rounding", () => {
  it("computes m3 × 280", () => {
    // 0.3 × 0.2 × 0.15 = 0.009 m3 → 2.52 kg
    expect(volumetricWeightKgFromMeters(0.3, 0.2, 0.15, 280)).toBeCloseTo(
      2.52,
      5,
    );
  });

  it("rounds UP to nearest 0.5 kg", () => {
    expect(roundUpToHalfKg(0.01)).toBe(0.5);
    expect(roundUpToHalfKg(0.49)).toBe(0.5);
    expect(roundUpToHalfKg(0.5)).toBe(0.5);
    expect(roundUpToHalfKg(0.51)).toBe(1.0);
    expect(roundUpToHalfKg(1.0)).toBe(1.0);
    expect(roundUpToHalfKg(1.01)).toBe(1.5);
  });
});

describe("Budbee Light pricing", () => {
  const rate = budbeeLightSwedenRateCard();

  it("0.5 kg → 79 SEK", () => {
    expect(
      priceParcelIncrementalWeightCents({
        chargeableWeightKg: 0.5,
        basePriceCents: rate.basePriceCents,
        includedWeightKg: rate.includedWeightKg,
        weightIncrementKg: rate.weightIncrementKg,
        incrementPriceCents: rate.incrementPriceCents,
      }),
    ).toBe(7900);
  });

  it("1.0 → 80, 1.5 → 81, 2.0 → 82, 5.0 → 88 SEK", () => {
    const price = (kg: number) =>
      priceParcelIncrementalWeightCents({
        chargeableWeightKg: kg,
        basePriceCents: rate.basePriceCents,
        includedWeightKg: rate.includedWeightKg,
        weightIncrementKg: rate.weightIncrementKg,
        incrementPriceCents: rate.incrementPriceCents,
      });
    expect(price(1.0)).toBe(8000);
    expect(price(1.5)).toBe(8100);
    expect(price(2.0)).toBe(8200);
    expect(price(5.0)).toBe(8800);
  });

  it("two identical parcels sum", () => {
    const b = calculateOutboundFreightQuoteBreakdown({
      rate,
      destinationCountry: "SE",
      bottleCount: 12,
      maxBottlesPerParcel: 6,
      lengthM: 0.1,
      widthM: 0.1,
      heightM: 0.1, // 0.28 kg → round 0.5 → 79 SEK each
      asOfDate: "2026-08-01",
    });
    expect(b.canCalculate).toBe(true);
    expect(b.parcelCount).toBe(2);
    expect(b.roundedVolumetricWeightKg).toBe(0.5);
    expect(b.totalAmountCents).toBe(2 * 7900);
  });

  it("manual handling +99 SEK per parcel when selected", () => {
    const b = calculateOutboundFreightQuoteBreakdown({
      rate,
      destinationCountry: "SE",
      bottleCount: 6,
      maxBottlesPerParcel: 6,
      lengthM: 0.1,
      widthM: 0.1,
      heightM: 0.1, // 0.28 → 0.5 kg → 79
      asOfDate: "2026-08-01",
      surcharges: [
        {
          code: "MANUAL_HANDLING",
          name: "Manual handling",
          amountCentsPerUnit: 9900,
          calculationType: "PER_PARCEL",
          selected: true,
        },
      ],
    });
    expect(b.totalAmountCents).toBe(7900 + 9900);
  });

  it("digital ID +5 when selected", () => {
    const b = calculateOutboundFreightQuoteBreakdown({
      rate,
      destinationCountry: "SE",
      bottleCount: 6,
      maxBottlesPerParcel: 6,
      lengthM: 0.1,
      widthM: 0.1,
      heightM: 0.1,
      asOfDate: "2026-08-01",
      surcharges: [
        {
          code: "DIGITAL_ID",
          name: "Digital ID",
          amountCentsPerUnit: 500,
          calculationType: "PER_PARCEL",
          selected: true,
        },
      ],
    });
    expect(b.totalAmountCents).toBe(7900 + 500);
  });

  it("remote area NOT applied for Sweden", () => {
    expect(isRemoteAreaBlockedForCountry("REMOTE_AREA_HOME", "SE")).toBe(true);
    const b = calculateOutboundFreightQuoteBreakdown({
      rate,
      destinationCountry: "SE",
      bottleCount: 6,
      maxBottlesPerParcel: 6,
      lengthM: 0.1,
      widthM: 0.1,
      heightM: 0.1,
      asOfDate: "2026-08-01",
      surcharges: [
        {
          code: "REMOTE_AREA_HOME",
          name: "Remote Area Home",
          amountCentsPerUnit: 1000,
          calculationType: "PER_PARCEL",
          selected: true,
          blockedForDestination: true,
        },
      ],
    });
    expect(b.totalAmountCents).toBe(7900);
    expect(b.components.find((c) => c.code === "REMOTE_AREA_HOME")?.applied).toBe(
      false,
    );
  });

  it("missing dimensions → cannot calculate", () => {
    const b = calculateOutboundFreightQuoteBreakdown({
      rate,
      destinationCountry: "SE",
      bottleCount: 6,
      maxBottlesPerParcel: 6,
      asOfDate: "2026-08-01",
    });
    expect(b.canCalculate).toBe(false);
    expect(b.totalAmountCents).toBeNull();
    expect(b.incompleteReasons.length).toBeGreaterThan(0);
  });

  it("DK destination rejected for SE rate", () => {
    const b = calculateOutboundFreightQuoteBreakdown({
      rate,
      destinationCountry: "DK",
      bottleCount: 6,
      maxBottlesPerParcel: 6,
      lengthM: 0.1,
      widthM: 0.1,
      heightM: 0.1,
      asOfDate: "2026-08-01",
    });
    expect(b.canCalculate).toBe(false);
  });

  it("offer expiry after 2026-08-18", () => {
    const b = calculateOutboundFreightQuoteBreakdown({
      rate,
      destinationCountry: "SE",
      bottleCount: 6,
      maxBottlesPerParcel: 6,
      lengthM: 0.1,
      widthM: 0.1,
      heightM: 0.1,
      asOfDate: "2026-08-19",
    });
    expect(b.canCalculate).toBe(false);
    expect(b.incompleteReasons.some((r) => r.includes("expired"))).toBe(true);
  });

  it("historical frozen total unchanged when catalogue rate changes", () => {
    const frozen = priceParcelIncrementalWeightCents({
      chargeableWeightKg: 1.0,
      basePriceCents: 7900,
      includedWeightKg: 0.5,
      weightIncrementKg: 0.5,
      incrementPriceCents: 100,
    });
    const laterCatalogue = priceParcelIncrementalWeightCents({
      chargeableWeightKg: 1.0,
      basePriceCents: 8900,
      includedWeightKg: 0.5,
      weightIncrementKg: 0.5,
      incrementPriceCents: 100,
    });
    expect(frozen).toBe(8000);
    expect(laterCatalogue).not.toBe(frozen);
  });
});

describe("parcel count + allocation", () => {
  it("resolves parcel count from max_bottles", () => {
    expect(
      resolveParcelCount({ bottleCount: 13, maxBottlesPerParcel: 6 }).parcelCount,
    ).toBe(3);
    expect(
      resolveParcelCount({ bottleCount: 6, maxBottlesPerParcel: null }).parcelCount,
    ).toBeNull();
  });

  it("allocates outbound total exactly across items", () => {
    const total = 8100;
    const shares = allocatePoolByWeights(total, [6, 6]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(8100);
  });

  it("multi-producer one parcel → one charge allocated, not × producers", () => {
    const outboundTotal = 7900;
    const producerShares = allocatePoolByWeights(outboundTotal, [3, 3]);
    expect(producerShares.reduce((a, b) => a + b, 0)).toBe(7900);
    expect(producerShares[0]! + producerShares[1]!).toBe(7900);
    expect(producerShares[0]).toBe(3950);
  });

  it("incomplete outbound marks contribution null", () => {
    const rows = buildReservationItemEconomicsRows({
      reservationId: "r1",
      lines: [{ merchandiseId: "w1", quantity: 6, lineTotalSek: 1500 }],
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
      outbound: {
        mode: "incomplete",
        reason: "Packaging dimensions missing",
        quoteId: "q1",
      },
      paymentFeeFixedCents: 180,
      assumptions: getContributionAssumptions({}),
    });
    expect(rows[0]!.pre_pallet_contribution_cents).toBeNull();
    expect(rows[0]!.economics_snapshot.incomplete).toBe(true);
    expect(rows[0]!.economics_snapshot.outbound_cost_source).toBe("incomplete");
  });

  it("quote mode uses allocated outbound not legacy last-mile", () => {
    const rows = buildReservationItemEconomicsRows({
      reservationId: "r1",
      lines: [{ merchandiseId: "w1", quantity: 6, lineTotalSek: 1500 }],
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
      outbound: {
        mode: "quote",
        allocatedOutboundCostCents: 7900,
        quoteId: "q-out",
        providerCode: "INSTABEE",
        serviceName: "Budbee Light Home Delivery – Sweden",
      },
      paymentFeeFixedCents: 180,
      assumptions: getContributionAssumptions({}),
    });
    expect(rows[0]!.pre_pallet_contribution_cents).not.toBeNull();
    expect(rows[0]!.economics_snapshot.unit_last_mile_cost_cents).toBe(
      Math.round(7900 / 6),
    );
    expect(rows[0]!.economics_snapshot.outbound_cost_source).toBe(
      "outbound_quote",
    );
    expect(rows[0]!.outbound_freight_quote_id).toBe("q-out");
  });
});

describe("shadow readiness unchanged", () => {
  it("119 bottles → not complete; 120 → complete regardless of economics", () => {
    expect(computePalletShipProgress(119, 120, 720).isReadyToShip).toBe(false);
    expect(computePalletShipProgress(120, 120, 720).isReadyToShip).toBe(true);
  });
});
