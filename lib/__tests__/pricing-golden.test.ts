/**
 * Pricing consolidation step 1 — golden locks for today's formula outputs.
 *
 * Surfaces covered (no production changes in this PR):
 * 1. lib/wine-retail-pricing.ts
 * 2. lib/price-breakdown.ts
 * 3. lib/b2b-wine-cost.ts
 * 4. lib/systembolaget-pricing.ts
 * 5. lib/b2b/inquiry-price-math.ts
 * 6. lib/reservation-auto-charge.ts (inline Math.ceil unit list SEK)
 *
 * Cross-surface divergences live in pricing-surface-divergences.test.ts.
 */
import { describe, expect, it } from "vitest";
import {
  computeB2bCustomerUnitPriceExclVatSek,
} from "@/lib/b2b-pallet-commercial";
import {
  computeInquiryB2bUnitPriceExclVatSek,
  b2bExclVatSekToUnitPriceCents,
} from "@/lib/b2b/inquiry-price-math";
import {
  getEffectiveExchangeRate,
  getWineCostCentsExVat,
  getWinePurchaseCostCentsPerBottle,
} from "@/lib/b2b-wine-cost";
import {
  calculateB2BPriceBreakdown,
  calculateB2BPriceExclVat,
  calculatePriceBreakdown,
  calculateRoundedB2BPriceExclVat,
} from "@/lib/price-breakdown";
import {
  calculateSystembolagetPrice,
  calculateSystembolagetPriceBreakdown,
} from "@/lib/systembolaget-pricing";
import {
  buildRetailPriceBreakdown,
  calculateRetailPriceCents,
  FALLBACK_SEK_RATES,
  resolveSekExchangeRateSync,
} from "@/lib/wine-retail-pricing";
import {
  PRICING_GOLDEN_WINES,
  wineById,
  type PricingGoldenWine,
} from "@/lib/__tests__/fixtures/pricing-golden-wines";

/** Mirrors reservation-auto-charge.ts unit list SEK (öre→SEK). Whole-kronor prices are exact. */
function reservationAutoChargeUnitListSek(basePriceCents: number): number {
  return Math.ceil(basePriceCents / 100);
}

function retailOpts(wine: PricingGoldenWine) {
  return {
    costAmount: wine.cost_amount,
    exchangeRate: wine.exchange_rate,
    priceIncludesVat: wine.price_includes_vat,
    marginPercentage: wine.margin_percentage,
    alcoholTaxCents: wine.alcohol_tax_cents,
  };
}

function costFields(wine: PricingGoldenWine) {
  return {
    cost_amount: wine.cost_amount,
    cost_currency: wine.cost_currency,
    exchange_rate: wine.exchange_rate,
    alcohol_tax_cents: wine.alcohol_tax_cents,
  };
}

describe("pricing golden: wine-retail-pricing", () => {
  it.each([
    ["a-love-supreme-2024", 15600],
    ["up-tempo-2024", 17400],
    ["hippie-killer-2023", 13000],
    ["blanc-de-noir-2024", 20700],
    ["flore-et-sens-2023", 16500],
    ["resiste-sek-b2b-card", 14400],
  ] as const)("%s → calculateRetailPriceCents = %i öre (whole kronor)", (id, cents) => {
    expect(calculateRetailPriceCents(retailOpts(wineById(id)))).toBe(cents);
  });

  it("buildRetailPriceBreakdown matches whole kronor + VAT from total for Up Tempo", () => {
    const wine = wineById("up-tempo-2024");
    const b = buildRetailPriceBreakdown(retailOpts(wine));
    expect(b.isValid).toBe(true);
    expect(b.finalPriceCents).toBe(17400);
    expect(b.finalPrice).toBe(174);
    expect(b.alcoholTaxInSek).toBe(22.19);
    expect(b.costAmountInSek).toBeCloseTo(8 * 11.13, 10);
    expect(b.vatRate).toBe(0.25);
    expect(b.vatAmountSek).toBeCloseTo(174 - 174 / 1.25, 10);
  });

  it("locks EUR/USD/GBP hardcoded FX fallbacks (never 1)", () => {
    expect(FALLBACK_SEK_RATES.EUR).toBe(11.25);
    expect(FALLBACK_SEK_RATES.USD).toBe(10.5);
    expect(FALLBACK_SEK_RATES.GBP).toBe(13.2);
    expect(resolveSekExchangeRateSync("EUR")).toBe(11.25);
    expect(resolveSekExchangeRateSync("EUR", 11.13)).toBe(11.13);
  });
});

describe("pricing golden: price-breakdown (B2B + B2C decompose)", () => {
  it.each([
    ["a-love-supreme-2024", 125.125, 125],
    ["up-tempo-2024", 139.0375, 139],
    ["hippie-killer-2023", 104.25625, 104],
    ["blanc-de-noir-2024", 165.47125, 165],
    ["flore-et-sens-2023", 131.98749999999998, 132],
    ["resiste-sek-b2b-card", 131.70000000000002, 132],
  ] as const)(
    "%s → raw B2B excl VAT and Math.round whole SEK (no shipping)",
    (id, raw, rounded) => {
      const wine = wineById(id);
      const unrounded = calculateB2BPriceExclVat(
        wine.cost_amount,
        wine.exchange_rate,
        wine.alcohol_tax_cents,
        wine.b2b_margin_percentage,
        0,
      );
      expect(unrounded).toBeCloseTo(raw, 10);
      expect(
        calculateRoundedB2BPriceExclVat(
          wine.cost_amount,
          wine.exchange_rate,
          wine.alcohol_tax_cents,
          wine.b2b_margin_percentage,
          0,
        ),
      ).toBe(rounded);
    },
  );

  it.each([
    ["a-love-supreme-2024", 126],
    ["up-tempo-2024", 140],
    ["hippie-killer-2023", 105],
    ["blanc-de-noir-2024", 166],
    ["flore-et-sens-2023", 140],
    ["resiste-sek-b2b-card", 132],
  ] as const)(
    "%s → rounded B2B excl VAT with fixture shipping = %i",
    (id, rounded) => {
      const wine = wineById(id);
      expect(
        calculateRoundedB2BPriceExclVat(
          wine.cost_amount,
          wine.exchange_rate,
          wine.alcohol_tax_cents,
          wine.b2b_margin_percentage,
          wine.shipping_per_bottle_sek,
        ),
      ).toBe(rounded);
    },
  );

  it("calculatePriceBreakdown B2C list total is whole-kronor unit (PDP path)", () => {
    const wine = wineById("a-love-supreme-2024");
    const breakdown = calculatePriceBreakdown({
      cost_amount: wine.cost_amount,
      exchange_rate: wine.exchange_rate,
      alcohol_tax_cents: wine.alcohol_tax_cents,
      margin_percentage: wine.margin_percentage,
      base_price_cents: wine.base_price_cents,
    });
    expect(breakdown.listTotalInclVat).toBe(156);
    // Component ceils can leave total 0.01 above the binding list (locked, not fixed here).
    expect(breakdown.total).toBe(156.01);
  });

  it("B2B breakdown total stays whole-SEK round for Up Tempo + ~6.67 shipping", () => {
    const wine = wineById("flore-et-sens-2023");
    const unit = calculateRoundedB2BPriceExclVat(
      wine.cost_amount,
      wine.exchange_rate,
      wine.alcohol_tax_cents,
      wine.b2b_margin_percentage,
      wine.shipping_per_bottle_sek,
    );
    const breakdown = calculateB2BPriceBreakdown(
      unit,
      wine.cost_amount,
      wine.exchange_rate,
      wine.alcohol_tax_cents,
      wine.b2b_margin_percentage,
      0,
      wine.shipping_per_bottle_sek,
    );
    expect(unit).toBe(140);
    expect(breakdown.total).toBe(140);
  });
});

describe("pricing golden: b2b-wine-cost", () => {
  it.each([
    ["a-love-supreme-2024", 10010, 7791],
    ["up-tempo-2024", 11123, 8904],
    ["hippie-killer-2023", 8341, 6122],
    ["blanc-de-noir-2024", 13238, 11019],
    ["flore-et-sens-2023", 10559, 8340],
    ["resiste-sek-b2b-card", 9219, 7000],
  ] as const)(
    "%s → cost+tax öre=%i, purchase-only öre=%i",
    (id, costCents, purchaseCents) => {
      const wine = wineById(id);
      expect(getWineCostCentsExVat(costFields(wine))).toBe(costCents);
      expect(getWinePurchaseCostCentsPerBottle(costFields(wine))).toBe(
        purchaseCents,
      );
    },
  );

  it("getEffectiveExchangeRate prefers stored rate; else rateMap; else 1", () => {
    expect(
      getEffectiveExchangeRate({
        cost_currency: "EUR",
        exchange_rate: 11.13,
      }),
    ).toBe(11.13);
    expect(
      getEffectiveExchangeRate(
        { cost_currency: "EUR", exchange_rate: null },
        { EUR: 11.2 },
      ),
    ).toBe(11.2);
    // TODO(pricing-consolidation): falls back to 1 for EUR — unlike wine-retail FALLBACK_SEK_RATES.
    expect(
      getEffectiveExchangeRate({
        cost_currency: "EUR",
        exchange_rate: null,
      }),
    ).toBe(1);
  });
});

describe("pricing golden: systembolaget-pricing", () => {
  it.each([
    ["a-love-supreme-2024", 146.69],
    ["up-tempo-2024", 163],
    ["hippie-killer-2023", 122.22],
    ["blanc-de-noir-2024", 193.99],
    ["flore-et-sens-2023", 154.73],
    ["resiste-sek-b2b-card", 135.1],
  ] as const)("%s → SB finalPrice = %f", (id, finalPrice) => {
    const wine = wineById(id);
    expect(
      calculateSystembolagetPrice(
        wine.cost_amount,
        wine.exchange_rate,
        wine.alcohol_tax_cents,
      ),
    ).toBe(finalPrice);
  });

  it("SB breakdown rounds components to 2 dp for Up Tempo", () => {
    const wine = wineById("up-tempo-2024");
    const b = calculateSystembolagetPriceBreakdown(
      wine.cost_amount,
      wine.exchange_rate,
      wine.alcohol_tax_cents,
    );
    expect(b.finalPrice).toBe(163);
    expect(b.costInSek).toBe(111.23);
    expect(b.marginPercentageExVat).toBe(14.7);
    expect(b.alcoholTaxInSek).toBe(22.19);
  });
});

describe("pricing golden: inquiry-price-math", () => {
  it.each(PRICING_GOLDEN_WINES)(
    "$label → inquiry unit matches rounded shop B2B (+ shipping)",
    (wine) => {
      const unit = computeInquiryB2bUnitPriceExclVatSek({
        costAmount: wine.cost_amount,
        exchangeRate: wine.exchange_rate,
        alcoholTaxCents: wine.alcohol_tax_cents,
        b2bMarginPercentage: wine.b2b_margin_percentage,
        shippingPerBottleSek: wine.shipping_per_bottle_sek,
      });
      const expected = calculateRoundedB2BPriceExclVat(
        wine.cost_amount,
        wine.exchange_rate,
        wine.alcohol_tax_cents,
        wine.b2b_margin_percentage,
        wine.shipping_per_bottle_sek,
      );
      expect(unit).toBe(expected);
      expect(b2bExclVatSekToUnitPriceCents(unit!)).toBe(expected * 100);
    },
  );

  it("Résiste SEK card fixture locks 132 kr / 13200 öre", () => {
    const wine = wineById("resiste-sek-b2b-card");
    const unit = computeInquiryB2bUnitPriceExclVatSek({
      costAmount: wine.cost_amount,
      exchangeRate: wine.exchange_rate,
      alcoholTaxCents: wine.alcohol_tax_cents,
      b2bMarginPercentage: wine.b2b_margin_percentage,
      shippingPerBottleSek: 0,
    });
    expect(unit).toBe(132);
    expect(b2bExclVatSekToUnitPriceCents(unit!)).toBe(13200);
  });
});

describe("pricing golden: reservation-auto-charge unit list SEK", () => {
  it.each([
    ["a-love-supreme-2024", 156],
    ["up-tempo-2024", 174],
    ["hippie-killer-2023", 130],
    ["blanc-de-noir-2024", 207],
    ["flore-et-sens-2023", 165],
    ["resiste-sek-b2b-card", 144],
  ] as const)(
    "%s stored base_price_cents → whole-kronor unit list = %i SEK",
    (id, unitSek) => {
      const wine = wineById(id);
      expect(reservationAutoChargeUnitListSek(wine.base_price_cents)).toBe(
        unitSek,
      );
    },
  );
});

describe("pricing golden: b2b-pallet-commercial (unrounded path)", () => {
  it("returns unrounded calculateB2BPriceExclVat (admin pallet commercial)", () => {
    const wine = wineById("up-tempo-2024");
    const unrounded = computeB2bCustomerUnitPriceExclVatSek(
      {
        ...costFields(wine),
        b2b_margin_percentage: wine.b2b_margin_percentage,
      },
      0,
      wine.b2b_margin_percentage,
    );
    expect(unrounded).toBeCloseTo(139.0375, 10);
    // Shop / inquiry would Math.round this to 139.
    expect(Math.round(unrounded!)).toBe(139);
  });
});
