import { describe, expect, it } from "vitest";
import {
  buildRetailPriceBreakdown,
  calculateRetailPriceCents,
  implyMarginPercentageFromRetailPrice,
  resolveSekExchangeRateSync,
} from "@/lib/wine-retail-pricing";

describe("wine retail pricing", () => {
  it("never resolves EUR→SEK as 1", () => {
    expect(resolveSekExchangeRateSync("EUR")).toBeGreaterThan(10);
    expect(resolveSekExchangeRateSync("EUR", 11.2)).toBe(11.2);
  });

  it("matches admin/PDP formula for A Love Supreme inputs", () => {
    const cents = calculateRetailPriceCents({
      costAmount: 7,
      exchangeRate: 11.2,
      priceIncludesVat: true,
      marginPercentage: 90.4,
      alcoholTaxCents: 2219,
    });
    expect(cents).toBe(130977);
  });

  it("reproduces saved 163 SEK when FX was wrongly 1 + tax 5.55", () => {
    const cents = calculateRetailPriceCents({
      costAmount: 7,
      exchangeRate: 1,
      priceIncludesVat: true,
      marginPercentage: 90.4,
      alcoholTaxCents: 555,
    });
    expect(cents).toBe(16341);
  });

  it("implies margin so cost+FX reproduce the shop price", () => {
    const margin = implyMarginPercentageFromRetailPrice({
      retailPriceCents: 16300,
      costAmount: 7,
      exchangeRate: 11.2,
      priceIncludesVat: true,
      alcoholTaxCents: 2219,
    });
    expect(margin).not.toBeNull();
    const cents = calculateRetailPriceCents({
      costAmount: 7,
      exchangeRate: 11.2,
      priceIncludesVat: true,
      marginPercentage: margin!,
      alcoholTaxCents: 2219,
    });
    expect(cents).toBe(16300);
  });

  it("buildRetailPriceBreakdown exposes inkl moms slutpris", () => {
    const b = buildRetailPriceBreakdown({
      costAmount: 7,
      exchangeRate: 11.2,
      priceIncludesVat: true,
      marginPercentage: 22.86,
      alcoholTaxCents: 2219,
    });
    expect(b.isValid).toBe(true);
    expect(b.finalPriceCents).toBe(16300);
  });
});
