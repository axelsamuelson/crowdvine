import { describe, expect, it } from "vitest";
import {
  b2cLineTotalSek,
  b2cLineTotalSekFromOre,
  b2cWholeKronorFromOre,
} from "@/lib/cart/b2c-line-pricing";
import { getProductListPriceSek } from "@/lib/price-breakdown";

describe("b2cWholeKronorFromOre — one price source (CFO half-up)", () => {
  it("29326 öre → 293 kr (not ceil 294)", () => {
    expect(b2cWholeKronorFromOre(29326)).toBe(293);
    expect(Math.ceil(29326 / 100)).toBe(294);
  });

  it("31000 öre → 310 kr (not 311)", () => {
    expect(b2cWholeKronorFromOre(31000)).toBe(310);
  });

  it("half-öre boundary: 29350 → 294 (half up)", () => {
    expect(b2cWholeKronorFromOre(29350)).toBe(294);
  });

  it("getProductListPriceSek matches shared helper (PLP/PDP/ServerListPrice)", () => {
    expect(
      getProductListPriceSek({
        priceBreakdown: { basePriceCents: 29326 },
      }),
    ).toBe(293);
    expect(
      getProductListPriceSek({
        priceBreakdown: { basePriceCents: 31000 },
      }),
    ).toBe(310);
  });

  it("line = unit × qty for early-bird on 107 list (never 2 × 86 = 171)", () => {
    const { unitSek, lineTotalSek } = b2cLineTotalSek({
      listUnitSek: 107,
      memberPercent: 0,
      earlyBirdTier: 20,
      quantity: 2,
    });
    expect(unitSek).toBe(86);
    expect(lineTotalSek).toBe(172);
    expect(unitSek * 2).toBe(lineTotalSek);
    expect(lineTotalSek).not.toBe(171);
  });

  it("öre path: 29326 list, qty 2, no discount → 293 × 2 = 586", () => {
    const { unitSek, lineTotalSek } = b2cLineTotalSekFromOre({
      listUnitOre: 29326,
      memberPercent: 0,
      earlyBirdTier: 0,
      quantity: 2,
    });
    expect(unitSek).toBe(293);
    expect(lineTotalSek).toBe(586);
  });

  it("öre path: 31000 list, qty 3 → 310 × 3 = 930", () => {
    const { unitSek, lineTotalSek } = b2cLineTotalSekFromOre({
      listUnitOre: 31000,
      memberPercent: 0,
      earlyBirdTier: 0,
      quantity: 3,
    });
    expect(unitSek).toBe(310);
    expect(lineTotalSek).toBe(930);
  });
});
