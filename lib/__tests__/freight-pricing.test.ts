import { describe, it, expect } from "vitest";
import {
  calculateFreightQuoteBreakdown,
  convertFreightTotalToSekCents,
  evaluateWeightCompatibility,
  hillebrandSeaJulyComponents,
  isFreightQuoteEconomicallyUsable,
  majorToMinor,
  percentOfMinor,
} from "../freight-pricing";
import { resolveFreightTargetCents } from "../pallet-contribution";
import {
  allocatePoolByWeights,
  buildReservationItemEconomicsRows,
  stripePercentFeeCents,
} from "../reservation-economics-snapshot";
import {
  resolvePurchaseCostCentsForContribution,
  resolvePurchaseFxForContribution,
} from "../exchange-rate-strict";
import { getContributionAssumptions } from "../contribution-assumptions";

describe("freight rounding helpers", () => {
  it("converts major to minor with round", () => {
    expect(majorToMinor(308)).toBe(30800);
    expect(majorToMinor(52.668)).toBe(5267);
  });

  it("percent of minor rounds to integer cents", () => {
    expect(percentOfMinor(30800, 17.1)).toBe(5267); // 52.668 → 52.67
    expect(percentOfMinor(30800, 8.6)).toBe(2649); // 26.488 → 26.49
  });
});

describe("Hillebrand July sea quote", () => {
  it("fixed base only → €308", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: [],
    });
    expect(b.canCalculate).toBe(true);
    expect(b.subtotalAmountMinor).toBe(30800);
    expect(b.subtotalAmount).toBe(308);
  });

  it("base + 17.1% fuel", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: [
        {
          name: "Fuel",
          calculationType: "PERCENT_OF_BASE",
          value: 17.1,
          isMandatory: true,
        },
      ],
    });
    expect(b.subtotalAmountMinor).toBe(30800 + 5267);
  });

  it("full current quote → €387.16", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: hillebrandSeaJulyComponents(),
    });
    expect(b.canCalculate).toBe(true);
    expect(b.baseAmountMinor).toBe(30800);
    expect(b.components.find((c) => c.code === "FUEL")?.amountMinor).toBe(5267);
    expect(
      b.components.find((c) => c.code === "EMERGENCY_FUEL")?.amountMinor,
    ).toBe(2649);
    // 308 + 52.67 + 26.49 = 387.16
    expect(b.subtotalAmountMinor).toBe(38716);
    expect(b.subtotalAmount).toBe(387.16);
  });

  it("does not compound emergency fuel on fuel", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: hillebrandSeaJulyComponents(),
    });
    const fuel = b.components.find((c) => c.code === "FUEL")!.amountMinor!;
    const emergency = b.components.find(
      (c) => c.code === "EMERGENCY_FUEL",
    )!.amountMinor!;
    expect(fuel).toBe(percentOfMinor(30800, 17.1));
    expect(emergency).toBe(percentOfMinor(30800, 8.6));
    expect(emergency).not.toBe(percentOfMinor(30800 + fuel, 8.6));
  });

  it("optional fixed add-on when selected", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: [
        ...hillebrandSeaJulyComponents().filter((c) => !c.isOptional),
        {
          name: "Pallet cover",
          calculationType: "FIXED",
          value: 40,
          isOptional: true,
          selected: true,
        },
      ],
    });
    expect(b.subtotalAmountMinor).toBe(38716 + 4000);
  });

  it("optional percentage add-on on base", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 100,
      components: [
        {
          name: "Cooling",
          calculationType: "PERCENT_OF_BASE",
          value: 10,
          isOptional: true,
          selected: true,
        },
      ],
    });
    expect(b.subtotalAmountMinor).toBe(11000);
  });

  it("per-kg component", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 100,
      weightKg: 50,
      components: [
        {
          name: "Weight fee",
          calculationType: "PER_KG",
          value: 0.4,
          isMandatory: true,
        },
      ],
    });
    expect(b.subtotalAmountMinor).toBe(10000 + 2000); // 50 * 0.40 = 20
  });

  it("spot service without amount cannot calculate", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: null,
      servicePricingType: "SPOT_QUOTE",
      components: [],
    });
    expect(b.canCalculate).toBe(false);
    expect(b.requiresSpotQuote).toBe(true);
  });

  it("spot service with amount becomes calculable", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: null,
      servicePricingType: "SPOT_QUOTE",
      serviceSpotAmountMajor: 650,
      components: [],
    });
    expect(b.canCalculate).toBe(true);
    expect(b.subtotalAmountMinor).toBe(65000);
  });

  it("selected optional spot without amount blocks calculation", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: [
        {
          name: "Cooling",
          calculationType: "SPOT_QUOTE",
          value: null,
          isOptional: true,
          selected: true,
        },
      ],
    });
    expect(b.canCalculate).toBe(false);
    expect(b.requiresSpotQuote).toBe(true);
  });

  it("PERCENT_OF_SUBTOTAL uses base + non-percent only", () => {
    const b = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 100,
      components: [
        {
          name: "Handling",
          calculationType: "FIXED",
          value: 20,
          isMandatory: true,
          sortOrder: 1,
        },
        {
          name: "Fuel",
          calculationType: "PERCENT_OF_SUBTOTAL",
          value: 10,
          isMandatory: true,
          sortOrder: 2,
        },
      ],
    });
    // 10% of (100+20) = 12 → total 132
    expect(b.subtotalAmountMinor).toBe(13200);
  });
});

describe("freight FX and economic usability", () => {
  it("converts EUR total with frozen FX", () => {
    const sek = convertFreightTotalToSekCents({
      currency: "EUR",
      totalAmountMinor: 38716,
      fxRateToSek: 11.5,
    });
    // 387.16 * 11.5 * 100
    expect(sek).toBe(Math.round(387.16 * 11.5 * 100));
  });

  it("missing FX → null SEK (never assume 1)", () => {
    expect(
      convertFreightTotalToSekCents({
        currency: "EUR",
        totalAmountMinor: 38716,
        fxRateToSek: null,
      }),
    ).toBeNull();
  });

  it("historical quote immutability of frozen totals", () => {
    const july = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: hillebrandSeaJulyComponents(),
    });
    const frozenTotal = july.subtotalAmountMinor;
    // Later rate card change does not mutate the frozen total we already stored
    const later = calculateFreightQuoteBreakdown({
      currency: "EUR",
      baseAmountMajor: 308,
      components: [
        {
          name: "Fuel",
          calculationType: "PERCENT_OF_BASE",
          value: 20,
          isMandatory: true,
        },
        {
          name: "Emergency",
          calculationType: "PERCENT_OF_BASE",
          value: 8.6,
          isMandatory: true,
        },
      ],
    });
    expect(frozenTotal).toBe(38716);
    expect(later.subtotalAmountMinor).not.toBe(frozenTotal);
  });

  it("FX change later does not alter frozen SEK", () => {
    const frozenSek = convertFreightTotalToSekCents({
      currency: "EUR",
      totalAmountMinor: 38716,
      fxRateToSek: 11.2,
    });
    const laterLiveFx = 12.0;
    expect(frozenSek).not.toBe(
      convertFreightTotalToSekCents({
        currency: "EUR",
        totalAmountMinor: 38716,
        fxRateToSek: laterLiveFx,
      }),
    );
    expect(frozenSek).toBe(Math.round(387.16 * 11.2 * 100));
  });

  it("weight compatibility", () => {
    expect(
      evaluateWeightCompatibility({ maxWeightKg: 800, actualWeightKg: null }),
    ).toBe("UNKNOWN");
    expect(
      evaluateWeightCompatibility({ maxWeightKg: 800, actualWeightKg: 700 }),
    ).toBe("COMPATIBLE");
    expect(
      evaluateWeightCompatibility({ maxWeightKg: 800, actualWeightKg: 900 }),
    ).toBe("INCOMPATIBLE");
  });

  it("incomplete quote not economically usable", () => {
    expect(
      isFreightQuoteEconomicallyUsable({
        canCalculate: false,
        totalCostSekCents: null,
      }),
    ).toBe(false);
    expect(
      isFreightQuoteEconomicallyUsable({
        canCalculate: true,
        totalCostSekCents: null,
      }),
    ).toBe(false);
    expect(
      isFreightQuoteEconomicallyUsable({
        canCalculate: true,
        totalCostSekCents: 400000,
        weightCompatibility: "INCOMPATIBLE",
      }),
    ).toBe(false);
  });
});

describe("freight target precedence", () => {
  it("manual override > selected quote > cost_cents", () => {
    expect(
      resolveFreightTargetCents({
        freight_target_cents: 1000,
        selected_inbound_freight_quote_total_sek_cents: 5000,
        cost_cents: 9000,
      }),
    ).toBe(1000);
    expect(
      resolveFreightTargetCents({
        freight_target_cents: null,
        selected_inbound_freight_quote_total_sek_cents: 5000,
        cost_cents: 9000,
      }),
    ).toBe(5000);
    expect(
      resolveFreightTargetCents({
        freight_target_cents: null,
        selected_inbound_freight_quote_total_sek_cents: null,
        cost_cents: 9000,
      }),
    ).toBe(9000);
  });
});

describe("Stripe fee correction", () => {
  it("percentage fee includes shipping revenue", () => {
    const productOnly = stripePercentFeeCents(25000, 0, 0.015);
    const withShip = stripePercentFeeCents(25000, 1317, 0.015);
    expect(withShip).toBeGreaterThan(productOnly);
    expect(withShip).toBe(Math.round((25000 + 1317) * 0.015));
  });

  it("fixed fee allocated once across multi-producer groups by bottles", () => {
    const fixedTotal = 180;
    const groupBottles = [6, 6];
    const shares = allocatePoolByWeights(fixedTotal, groupBottles);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(180);
    expect(shares).toEqual([90, 90]);
  });

  it("snapshot builder uses product+shipping for percent fee", () => {
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
      lastMileCostCentsPerBottle: 833,
      paymentFeeFixedCents: 180,
      assumptions: getContributionAssumptions({}),
    });
    const unit = rows[0]!.economics_snapshot;
    const expectedPercent = stripePercentFeeCents(
      unit.unit_gross_revenue_cents,
      unit.unit_shipping_revenue_gross_cents,
      0.015,
    );
    const unitFixed = Math.round(180 / 6);
    expect(unit.unit_payment_fee_cents).toBe(expectedPercent + unitFixed);
  });
});

describe("contribution FX safety", () => {
  it("EUR wine with valid FX → SEK purchase cost", () => {
    const r = resolvePurchaseCostCentsForContribution({
      cost_amount: 10,
      cost_currency: "EUR",
      exchange_rate: 11.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cents).toBe(Math.round(10 * 11.5 * 100));
  });

  it("EUR wine without FX → incomplete (no 1:1)", () => {
    const fx = resolvePurchaseFxForContribution({
      cost_amount: 10,
      cost_currency: "EUR",
      exchange_rate: null,
    });
    expect(fx.ok).toBe(false);

    const rows = buildReservationItemEconomicsRows({
      reservationId: "r1",
      lines: [{ merchandiseId: "w1", quantity: 6, lineTotalSek: 1500 }],
      wineById: new Map([
        [
          "w1",
          {
            cost_amount: 10,
            cost_currency: "EUR",
            exchange_rate: null,
            alcohol_tax_cents: 2219,
            price_includes_vat: true,
          },
        ],
      ]),
      orderLevelDiscountCents: 0,
      shippingRevenueGrossCents: 0,
      lastMileCostCentsPerBottle: 0,
      paymentFeeFixedCents: 0,
      rateMap: {},
      assumptions: getContributionAssumptions({}),
    });
    expect(rows[0]!.pre_pallet_contribution_cents).toBeNull();
    expect(rows[0]!.economics_snapshot.incomplete).toBe(true);
  });
});
