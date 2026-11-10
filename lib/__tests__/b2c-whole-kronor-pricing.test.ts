import { describe, expect, it } from "vitest";
import {
  buildRetailPriceBreakdown,
  calculateRetailPriceCents,
} from "@/lib/wine-retail-pricing";
import { calculateUnitPrice } from "@/lib/pricing/calculate";
import { B2C_RETAIL_TODAY, B2B_SHOP_TODAY } from "@/lib/pricing/defaults";
import { wineById } from "@/lib/__tests__/fixtures/pricing-golden-wines";

describe("PACT B2C whole-kronor consumer unit price", () => {
  it.each([
    ["a-love-supreme-2024", 156, 15600],
    ["up-tempo-2024", 174, 17400],
    ["hippie-killer-2023", 130, 13000],
  ] as const)(
    "%s → binding unit %i kr (%i öre); VAT from total",
    (id, sek, ore) => {
      const wine = wineById(id);
      const b = buildRetailPriceBreakdown({
        costAmount: wine.cost_amount,
        exchangeRate: wine.exchange_rate,
        priceIncludesVat: true,
        marginPercentage: wine.margin_percentage,
        alcoholTaxCents: wine.alcohol_tax_cents,
      });
      expect(b.finalPrice).toBe(sek);
      expect(b.finalPriceCents).toBe(ore);
      expect(calculateRetailPriceCents({
        costAmount: wine.cost_amount,
        exchangeRate: wine.exchange_rate,
        priceIncludesVat: true,
        marginPercentage: wine.margin_percentage,
        alcoholTaxCents: wine.alcohol_tax_cents,
      })).toBe(ore);
      expect(b.vatAmountSek).toBeCloseTo(sek - sek / 1.25, 10);
      // line = unit × qty is exact for whole kronor
      expect(sek * 6).toBe(Math.round(sek * 6));
    },
  );

  it("lib/pricing B2C preset matches wine-retail-pricing whole kronor", () => {
    const wine = wineById("a-love-supreme-2024");
    const priced = calculateUnitPrice(
      {
        costAmount: wine.cost_amount,
        costCurrency: wine.cost_currency,
        exchangeRate: wine.exchange_rate,
        alcoholTaxCents: wine.alcohol_tax_cents,
        marginPercentage: wine.margin_percentage,
      },
      B2C_RETAIL_TODAY,
    )!;
    expect(B2C_RETAIL_TODAY.rounding).toBe("round_sek");
    expect(priced.totalOre).toBe(15600);
  });

  it("does not change Dirty Wine / B2B shop rounding", () => {
    const wine = wineById("up-tempo-2024");
    const b2b = calculateUnitPrice(
      {
        costAmount: wine.cost_amount,
        costCurrency: wine.cost_currency,
        exchangeRate: wine.exchange_rate,
        alcoholTaxCents: wine.alcohol_tax_cents,
        marginPercentage: wine.b2b_margin_percentage,
        shippingPerBottleSek: 0,
      },
      B2B_SHOP_TODAY,
    )!;
    expect(B2B_SHOP_TODAY.rounding).toBe("round_sek");
    expect(b2b.totalOre).toBe(13900);
  });
});
