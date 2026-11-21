import { describe, expect, it } from "vitest";
import {
  computeSwedishWineAlcoholTaxSek,
  parseWineAbvPercent,
  swedishWineAlcoholTaxSekPerLiter,
  wineIndicatesFortifiedOrMellanklass,
} from "@/lib/skatteverket/wine-alcohol-tax";

describe("swedishWineAlcoholTaxSekPerLiter", () => {
  it("returns null for missing or invalid ABV", () => {
    expect(swedishWineAlcoholTaxSekPerLiter(null)).toBeNull();
    expect(swedishWineAlcoholTaxSekPerLiter(undefined)).toBeNull();
    expect(swedishWineAlcoholTaxSekPerLiter(Number.NaN)).toBeNull();
  });

  it("returns null when ABV is >18% (out of wine tax bands)", () => {
    expect(swedishWineAlcoholTaxSekPerLiter(18.1)).toBeNull();
    expect(swedishWineAlcoholTaxSekPerLiter(20)).toBeNull();
  });

  it("maps ABV bands with över X / högst Y (no gaps)", () => {
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

  it("places just-over boundary values in the next band (no gaps)", () => {
    expect(swedishWineAlcoholTaxSekPerLiter(2.255)?.sekPerLiter).toBe(10.38);
    expect(swedishWineAlcoholTaxSekPerLiter(4.505)?.sekPerLiter).toBe(15.34);
    expect(swedishWineAlcoholTaxSekPerLiter(7.005)?.sekPerLiter).toBe(21.12);
    expect(swedishWineAlcoholTaxSekPerLiter(8.505)?.sekPerLiter).toBe(29.58);
    expect(swedishWineAlcoholTaxSekPerLiter(15.005)?.sekPerLiter).toBe(61.9);
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

  it("rounds ONCE on line total litres (6×0.75 L at 13% = 133.11, never 133.14)", () => {
    // Correct: 29.58 × 4.5 = 133.11. Wrong (per-bottle then ×qty): 22.19 × 6 = 133.14.
    const totalLiters = 6 * 0.75;
    expect(
      computeSwedishWineAlcoholTaxSek({
        abvPercent: 13,
        volumeLiters: totalLiters,
      }),
    ).toBe(133.11);
    expect(22.19 * 6).toBeCloseTo(133.14, 10);
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

describe("wineIndicatesFortifiedOrMellanklass", () => {
  it("detects fortified / mellanklass markers", () => {
    expect(
      wineIndicatesFortifiedOrMellanklass({ classification: "fortified" }),
    ).toBe(true);
    expect(
      wineIndicatesFortifiedOrMellanklass({ wineName: "Maury mellanklass" }),
    ).toBe(true);
    expect(wineIndicatesFortifiedOrMellanklass({ color: "starkvin" })).toBe(
      true,
    );
    expect(
      wineIndicatesFortifiedOrMellanklass({ tags: ["Portvin", "red"] }),
    ).toBe(true);
  });

  it("does not flag ordinary still wine", () => {
    expect(
      wineIndicatesFortifiedOrMellanklass({
        wineName: "Premices",
        color: "red",
        classification: null,
      }),
    ).toBe(false);
  });
});
