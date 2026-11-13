import { describe, expect, it } from "vitest";
import {
  computeSwedishWineAlcoholTaxSek,
  parseWineAbvPercent,
  swedishWineAlcoholTaxSekPerLiter,
} from "@/lib/skatteverket/wine-alcohol-tax";

describe("swedishWineAlcoholTaxSekPerLiter", () => {
  it("returns null for missing or invalid ABV", () => {
    expect(swedishWineAlcoholTaxSekPerLiter(null)).toBeNull();
    expect(swedishWineAlcoholTaxSekPerLiter(undefined)).toBeNull();
    expect(swedishWineAlcoholTaxSekPerLiter(Number.NaN)).toBeNull();
  });

  it("returns null outside wine tax scope (≤1.2% or >18%)", () => {
    expect(swedishWineAlcoholTaxSekPerLiter(1.2)).toBeNull();
    expect(swedishWineAlcoholTaxSekPerLiter(0)).toBeNull();
    expect(swedishWineAlcoholTaxSekPerLiter(18.1)).toBeNull();
  });

  it("maps ABV bands to Skatteverket SEK/liter rates (from 2024-01-01)", () => {
    expect(swedishWineAlcoholTaxSekPerLiter(2.25)?.sekPerLiter).toBe(0);
    expect(swedishWineAlcoholTaxSekPerLiter(2.26)?.sekPerLiter).toBe(10.38);
    expect(swedishWineAlcoholTaxSekPerLiter(4.5)?.sekPerLiter).toBe(10.38);
    expect(swedishWineAlcoholTaxSekPerLiter(4.51)?.sekPerLiter).toBe(15.34);
    expect(swedishWineAlcoholTaxSekPerLiter(7)?.sekPerLiter).toBe(15.34);
    expect(swedishWineAlcoholTaxSekPerLiter(7.01)?.sekPerLiter).toBe(21.12);
    expect(swedishWineAlcoholTaxSekPerLiter(8.5)?.sekPerLiter).toBe(21.12);
    expect(swedishWineAlcoholTaxSekPerLiter(8.51)?.sekPerLiter).toBe(29.58);
    expect(swedishWineAlcoholTaxSekPerLiter(13)?.sekPerLiter).toBe(29.58);
    expect(swedishWineAlcoholTaxSekPerLiter(15)?.sekPerLiter).toBe(29.58);
    expect(swedishWineAlcoholTaxSekPerLiter(15.01)?.sekPerLiter).toBe(61.9);
    expect(swedishWineAlcoholTaxSekPerLiter(18)?.sekPerLiter).toBe(61.9);
  });
});

describe("computeSwedishWineAlcoholTaxSek", () => {
  it("matches the common 0.75 L × 8.5–15% band (22.19 SEK)", () => {
    expect(
      computeSwedishWineAlcoholTaxSek({
        abvPercent: 13,
        volumeLiters: 0.75,
      }),
    ).toBe(22.19);
  });

  it("scales by quantity/volume (6 × 0.75 L = 4.5 L → 133.11 SEK)", () => {
    expect(
      computeSwedishWineAlcoholTaxSek({
        abvPercent: 12.5,
        volumeLiters: 4.5,
      }),
    ).toBe(133.11);
  });

  it("uses the 15–18% band for high-ABV wine", () => {
    // 61.90 × 0.75 = 46.425 → 46.43
    expect(
      computeSwedishWineAlcoholTaxSek({
        abvPercent: 15.5,
        volumeLiters: 0.75,
      }),
    ).toBe(46.43);
  });

  it("returns null when ABV or volume is missing", () => {
    expect(
      computeSwedishWineAlcoholTaxSek({
        abvPercent: null,
        volumeLiters: 0.75,
      }),
    ).toBeNull();
    expect(
      computeSwedishWineAlcoholTaxSek({
        abvPercent: 13,
        volumeLiters: 0,
      }),
    ).toBeNull();
  });
});

describe("parseWineAbvPercent", () => {
  it("parses alcohol_percentage numbers and strings", () => {
    expect(parseWineAbvPercent(null, 13.5)).toBe(13.5);
    expect(parseWineAbvPercent(null, "12")).toBe(12);
  });

  it("parses abv display strings when percentage is missing", () => {
    expect(parseWineAbvPercent("13.5 %", null)).toBe(13.5);
    expect(parseWineAbvPercent("13,5%", null)).toBe(13.5);
  });

  it("prefers alcohol_percentage over abv text", () => {
    expect(parseWineAbvPercent("14 %", 13)).toBe(13);
  });

  it("returns null when both are missing or unparseable", () => {
    expect(parseWineAbvPercent(null, null)).toBeNull();
    expect(parseWineAbvPercent("", "")).toBeNull();
    expect(parseWineAbvPercent("n/a", "x")).toBeNull();
  });
});
