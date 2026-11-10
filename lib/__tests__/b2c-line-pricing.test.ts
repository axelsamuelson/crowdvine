import { describe, expect, it } from "vitest";
import { b2cDiscountedUnitSek, b2cLineTotalSek } from "@/lib/cart/b2c-line-pricing";

describe("b2cLineTotalSek — whole kronor unit first", () => {
  it("2 × unit after 20% early-bird: round unit then × qty (not round line)", () => {
    // Member unit 86, early-bird 20% → Math.round(68.8) = 69; 2 × 69 = 138
    const { unitSek, lineTotalSek } = b2cLineTotalSek({
      listUnitSek: 86,
      memberPercent: 0,
      earlyBirdTier: 20,
      quantity: 2,
    });
    expect(unitSek).toBe(69);
    expect(lineTotalSek).toBe(138);
    expect(unitSek * 2).toBe(lineTotalSek);
  });

  it("2 × 85.5-type case: list 107, member 0, tier 20 → unit 86, line 172", () => {
    // Math.round(107 * 0.8) = Math.round(85.6) = 86; 2 × 86 = 172
    const { unitSek, lineTotalSek } = b2cLineTotalSek({
      listUnitSek: 107,
      memberPercent: 0,
      earlyBirdTier: 20,
      quantity: 2,
    });
    expect(unitSek).toBe(86);
    expect(lineTotalSek).toBe(172);
    expect(`${unitSek} × 2`).not.toMatch(/171/);
  });

  it("discounted unit helper matches line unit", () => {
    expect(
      b2cDiscountedUnitSek({
        listUnitSek: 200,
        memberPercent: 0,
        earlyBirdTier: 20,
      }),
    ).toBe(160);
  });
});
