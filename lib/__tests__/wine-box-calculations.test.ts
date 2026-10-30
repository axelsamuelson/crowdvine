import { describe, expect, it } from "vitest";
import {
  computeWineBoxPriceFromLines,
  wineBoxBottlePriceCents,
} from "@/lib/wine-box-calculations";

describe("wine box bottle-sum pricing", () => {
  it("reads the same bottle list price producer boxes use (base_price_cents)", () => {
    expect(wineBoxBottlePriceCents(15641)).toBe(15641);
    expect(wineBoxBottlePriceCents(null)).toBeUndefined();
    expect(wineBoxBottlePriceCents(undefined)).toBeUndefined();
  });

  it("prices Meigoon Box as 3×Ultravision + 3×Extralucide (inkl. moms)", () => {
    // Live Meigoon Box contents (Ultravision 3 + Extralucide 3).
    const ultravisionCents = 15641; // 156.41 SEK inkl. moms, 20% margin
    const extralucideCents = 16510; // 165.10 SEK inkl. moms, 20% margin

    const priced = computeWineBoxPriceFromLines([
      {
        wineId: "ultravision",
        wineName: "Ultravision",
        vintage: "2023",
        basePriceCents: ultravisionCents,
        quantity: 3,
      },
      {
        wineId: "extralucide",
        wineName: "Extralucide",
        vintage: "2023",
        basePriceCents: extralucideCents,
        quantity: 3,
      },
    ]);

    const expectedCents = 3 * ultravisionCents + 3 * extralucideCents;
    expect(priced.totalCents).toBe(expectedCents);
    expect(priced.finalPrice).toBe(expectedCents / 100);
    expect(priced.totalWinePrice).toBe(priced.finalPrice);
    expect(priced.discountAmount).toBe(0);
    expect(priced.discountPercentage).toBe(0);
    expect(priced.marginAmount).toBe(0);
    expect(priced.bottleCount).toBe(6);
    expect(priced.wines).toEqual([
      {
        wineId: "ultravision",
        wineName: "Ultravision",
        vintage: "2023",
        price: ultravisionCents / 100,
        quantity: 3,
      },
      {
        wineId: "extralucide",
        wineName: "Extralucide",
        vintage: "2023",
        price: extralucideCents / 100,
        quantity: 3,
      },
    ]);

    // Explicit identity: box = Σ bottle list price × qty
    expect(priced.finalPrice).toBe(
      3 * (ultravisionCents / 100) + 3 * (extralucideCents / 100),
    );
    expect(priced.totalCents).toBe(96453);
    expect(priced.finalPrice).toBe(964.53);
  });

  it("does not use the old (cost × FX + tax) × 1.15 ex-VAT formula", () => {
    // Same Meigoon cost inputs as production; old formula ≈ 709.89 SEK ex moms.
    const oldCostBased =
      ((7.0 * 11.13 + 22.19) * 3 + (7.5 * 11.13 + 22.19) * 3) * 1.15;
    const priced = computeWineBoxPriceFromLines([
      {
        wineId: "u",
        wineName: "Ultravision",
        vintage: "2023",
        basePriceCents: 15641,
        quantity: 3,
      },
      {
        wineId: "e",
        wineName: "Extralucide",
        vintage: "2023",
        basePriceCents: 16510,
        quantity: 3,
      },
    ]);

    expect(Math.round(oldCostBased)).toBe(710);
    expect(priced.finalPrice).not.toBeCloseTo(oldCostBased, 0);
    expect(priced.finalPrice).toBeGreaterThan(oldCostBased);
  });
});
