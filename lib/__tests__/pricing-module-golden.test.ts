/**
 * Pricing consolidation step 2 — `lib/pricing/` reproduces PR #143 golden
 * values under the matching config presets. No production wiring.
 */
import { describe, expect, it } from "vitest";
import {
  B2B_COMMERCIAL_TODAY,
  B2B_COST_FX_FALLBACK,
  B2B_SHOP_TODAY,
  B2C_RETAIL_FX_FALLBACK,
  B2C_RETAIL_TODAY,
  FALLBACK_SEK_RATES,
  applyB2cMemberDiscountOre,
  applyPalletDiscountOre,
  calculateB2bExclVatSek,
  calculateUnitPrice,
  resolveFxRate,
  type PriceInput,
  type PricingConfig,
} from "@/lib/pricing";
import {
  PRICING_GOLDEN_WINES,
  wineById,
  type PricingGoldenWine,
} from "@/lib/__tests__/fixtures/pricing-golden-wines";

function b2cInput(wine: PricingGoldenWine): PriceInput {
  return {
    costAmount: wine.cost_amount,
    costCurrency: wine.cost_currency,
    exchangeRate: wine.exchange_rate,
    alcoholTaxCents: wine.alcohol_tax_cents,
    marginPercentage: wine.margin_percentage,
  };
}

function b2bInput(
  wine: PricingGoldenWine,
  shippingPerBottleSek = 0,
): PriceInput {
  return {
    costAmount: wine.cost_amount,
    costCurrency: wine.cost_currency,
    exchangeRate: wine.exchange_rate,
    alcoholTaxCents: wine.alcohol_tax_cents,
    marginPercentage: wine.b2b_margin_percentage,
    shippingPerBottleSek,
  };
}

describe("lib/pricing golden: B2C retail (round_sek + explicit FX)", () => {
  it.each([
    ["a-love-supreme-2024", 15600],
    ["up-tempo-2024", 17400],
    ["hippie-killer-2023", 13000],
    ["blanc-de-noir-2024", 20700],
    ["flore-et-sens-2023", 16500],
    ["resiste-sek-b2b-card", 14400],
  ] as const)("%s → totalOre = %i (whole kronor)", (id, cents) => {
    const result = calculateUnitPrice(b2cInput(wineById(id)), B2C_RETAIL_TODAY);
    expect(result).not.toBeNull();
    expect(result!.totalOre).toBe(cents);
    expect(result!.listTotalOre).toBe(cents);
    expect(result!.config.rounding).toBe("round_sek");
    expect(result!.config.fxSource).toBe("explicit");
  });

  it("Up Tempo breakdown exposes cost/tax/VAT before end rounding", () => {
    const wine = wineById("up-tempo-2024");
    const result = calculateUnitPrice(b2cInput(wine), B2C_RETAIL_TODAY)!;
    expect(result.breakdown.alcoholTaxOre).toBe(2219);
    expect(result.breakdown.costOre).toBeCloseTo(8 * 11.13 * 100, 10);
    expect(result.breakdown.vatOre).toBeGreaterThan(0);
    expect(result.breakdown.shippingOre).toBe(0);
    expect(result.breakdown.resolvedFx).toBe(11.13);
    expect(result.config.vatRate).toBe(0.25);
  });
});

describe("lib/pricing golden: B2B shop (round_sek + explicit FX)", () => {
  it.each([
    ["a-love-supreme-2024", 125.125, 125],
    ["up-tempo-2024", 139.0375, 139],
    ["hippie-killer-2023", 104.25625, 104],
    ["blanc-de-noir-2024", 165.47125, 165],
    ["flore-et-sens-2023", 131.98749999999998, 132],
    ["resiste-sek-b2b-card", 131.70000000000002, 132],
  ] as const)(
    "%s → unrounded commercial vs shop rounded (no shipping)",
    (id, rawSek, roundedSek) => {
      const wine = wineById(id);
      const commercial = calculateB2bExclVatSek(
        b2bInput(wine, 0),
        B2B_COMMERCIAL_TODAY,
      );
      const shop = calculateB2bExclVatSek(b2bInput(wine, 0), B2B_SHOP_TODAY);
      expect(commercial).toBeCloseTo(rawSek, 10);
      expect(shop).toBe(roundedSek);
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
    "%s → shop B2B excl VAT with fixture shipping = %i SEK",
    (id, rounded) => {
      const wine = wineById(id);
      expect(
        calculateB2bExclVatSek(
          b2bInput(wine, wine.shipping_per_bottle_sek),
          B2B_SHOP_TODAY,
        ),
      ).toBe(rounded);
    },
  );

  it("Résiste SEK card fixture locks 132 kr / 13200 öre", () => {
    const wine = wineById("resiste-sek-b2b-card");
    const result = calculateUnitPrice(
      b2bInput(wine, 0),
      B2B_SHOP_TODAY,
    )!;
    expect(result.totalSek).toBe(132);
    expect(result.totalOre).toBe(13200);
  });

  it("Flore Et Sens + ~6.67 shipping → 140 SEK excl VAT", () => {
    const wine = wineById("flore-et-sens-2023");
    const result = calculateUnitPrice(
      b2bInput(wine, wine.shipping_per_bottle_sek),
      B2B_SHOP_TODAY,
    )!;
    expect(result.totalOre).toBe(14000);
    expect(result.breakdown.shippingOre).toBeCloseTo(
      wine.shipping_per_bottle_sek * 100,
      10,
    );
  });
});

describe("lib/pricing golden: B2B commercial unrounded path", () => {
  it("Up Tempo no shipping ≈ 139.0375 SEK", () => {
    const wine = wineById("up-tempo-2024");
    const result = calculateUnitPrice(
      b2bInput(wine, 0),
      B2B_COMMERCIAL_TODAY,
    )!;
    expect(result.totalSek).toBeCloseTo(139.0375, 10);
    expect(result.config.rounding).toBe("none");
  });
});

describe("lib/pricing golden: cost base öre (matches b2b-wine-cost)", () => {
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
      const result = calculateUnitPrice(
        b2bInput(wine, 0),
        B2B_COMMERCIAL_TODAY,
      )!;
      const costPlusTax = Math.round(
        result.breakdown.costOre + result.breakdown.alcoholTaxOre,
      );
      const purchase = Math.round(result.breakdown.costOre);
      expect(costPlusTax).toBe(costCents);
      expect(purchase).toBe(purchaseCents);
    },
  );
});

describe("lib/pricing: FX source configs (documented divergences)", () => {
  it("locks retail hardcoded FX fallbacks", () => {
    expect(FALLBACK_SEK_RATES.EUR).toBe(11.25);
    expect(FALLBACK_SEK_RATES.USD).toBe(10.5);
    expect(FALLBACK_SEK_RATES.GBP).toBe(13.2);
    expect(
      resolveFxRate("retail_fallback", {
        costCurrency: "EUR",
        exchangeRate: null,
      }),
    ).toBe(11.25);
    expect(
      resolveFxRate("retail_fallback", {
        costCurrency: "EUR",
        exchangeRate: 11.13,
      }),
    ).toBe(11.13);
  });

  it("b2b_cost_fallback → 1 for missing EUR (unlike retail)", () => {
    expect(
      resolveFxRate("b2b_cost_fallback", {
        costCurrency: "EUR",
        exchangeRate: null,
      }),
    ).toBe(1);
    expect(
      resolveFxRate("b2b_cost_fallback", {
        costCurrency: "EUR",
        exchangeRate: null,
        rateMap: { EUR: 11.2 },
      }),
    ).toBe(11.2);
  });

  it("same cost: retail_fallback vs b2b_cost_fallback magnitude gap", () => {
    const wine = wineById("a-love-supreme-2024");
    const input: PriceInput = {
      costAmount: wine.cost_amount,
      costCurrency: "EUR",
      exchangeRate: null,
      alcoholTaxCents: wine.alcohol_tax_cents,
      marginPercentage: wine.margin_percentage,
    };
    const retail = calculateUnitPrice(input, B2C_RETAIL_FX_FALLBACK)!;
    // Re-run B2C formula with b2b FX fallback (rate=1) for the divergence lock.
    const withB2bFx: PricingConfig = {
      channel: "b2c",
      fxSource: "b2b_cost_fallback",
      rounding: "round_sek",
      vatRate: 0.25,
    };
    const b2bFx = calculateUnitPrice(input, withB2bFx)!;
    expect(retail.totalOre).toBe(15800);
    expect(b2bFx.totalOre).toBe(4600);
    expect(retail.totalOre - b2bFx.totalOre).toBeGreaterThan(10_000);
  });

  it("explicit FX throws without a positive rate", () => {
    expect(() =>
      resolveFxRate("explicit", { costCurrency: "EUR", exchangeRate: null }),
    ).toThrow(/explicit/);
  });

  it("B2B_COST_FX_FALLBACK preset is available for later migration", () => {
    expect(B2B_COST_FX_FALLBACK.fxSource).toBe("b2b_cost_fallback");
    expect(B2B_COST_FX_FALLBACK.rounding).toBe("round_sek");
  });
});

describe("lib/pricing: rounding applied once at the end", () => {
  it("breakdown components stay full-precision; totalOre is whole kronor", () => {
    const wine = wineById("a-love-supreme-2024");
    const result = calculateUnitPrice(b2cInput(wine), B2C_RETAIL_TODAY)!;
    // Raw: 156.40625 SEK → round_sek → 15600 öre once at end.
    expect(result.breakdown.costOre + result.breakdown.alcoholTaxOre).toBeCloseTo(
      10010,
      10,
    );
    expect(result.breakdown.priceExVatOre).toBeCloseTo(12512.5, 10);
    expect(result.breakdown.vatOre).toBeCloseTo(3128.125, 10);
    expect(result.totalOre).toBe(15600);
    expect(result.totalSek).toBe(156);
  });
});

describe("lib/pricing: member + pallet discounts (post formula)", () => {
  it("B2C member 10% on A Love Supreme list 15600 öre", () => {
    const wine = wineById("a-love-supreme-2024");
    const result = calculateUnitPrice(b2cInput(wine), B2C_RETAIL_TODAY, {
      memberDiscountPercent: 10,
    })!;
    const expectedOre = applyB2cMemberDiscountOre(15600, 10);
    expect(result.listTotalOre).toBe(15600);
    expect(result.totalOre).toBe(expectedOre);
    expect(result.memberDiscountOre).toBe(15600 - expectedOre);
    expect(result.totalOre).toBeLessThan(result.listTotalOre);
  });

  it("B2C member then pallet tier 20 stacks (multiplicative)", () => {
    const wine = wineById("up-tempo-2024");
    const result = calculateUnitPrice(b2cInput(wine), B2C_RETAIL_TODAY, {
      memberDiscountPercent: 10,
      palletTier: 20,
    })!;
    const afterMember = applyB2cMemberDiscountOre(17400, 10);
    const afterPallet = applyPalletDiscountOre(afterMember, 20);
    expect(result.totalOre).toBe(afterPallet);
    expect(result.memberDiscountOre).toBe(17400 - afterMember);
    expect(result.palletDiscountOre).toBe(afterMember - afterPallet);
  });

  it("B2B member discount reduces margin only", () => {
    const wine = wineById("resiste-sek-b2b-card");
    const result = calculateUnitPrice(b2bInput(wine, 0), B2B_SHOP_TODAY, {
      memberDiscountPercent: 50,
    })!;
    // After round_sek list=132; reverse cost+tax=132*0.7=92.4; half margin → 112.2
    expect(result.listTotalOre).toBe(13200);
    expect(result.totalSek).toBe(112.2);
    expect(result.memberDiscountOre).toBe(13200 - 11220);
  });

  it("pallet tier is ignored on B2B channel", () => {
    const wine = wineById("up-tempo-2024");
    const result = calculateUnitPrice(b2bInput(wine, 0), B2B_SHOP_TODAY, {
      palletTier: 20,
    })!;
    expect(result.totalOre).toBe(13900);
    expect(result.palletDiscountOre).toBeUndefined();
  });
});

describe("lib/pricing: all golden wines produce valid results under TODAY presets", () => {
  it.each(PRICING_GOLDEN_WINES)("$label B2C + B2B shop configs succeed", (wine) => {
    expect(calculateUnitPrice(b2cInput(wine), B2C_RETAIL_TODAY)?.totalOre).toBeGreaterThan(
      0,
    );
    expect(
      calculateUnitPrice(
        b2bInput(wine, wine.shipping_per_bottle_sek),
        B2B_SHOP_TODAY,
      )?.totalOre,
    ).toBeGreaterThan(0);
  });
});
