import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  b2cLineTotalSekFromOre,
  b2cWholeKronorFromOre,
} from "@/lib/cart/b2c-line-pricing";
import {
  calculatePriceBreakdown,
  getProductListPriceSek,
} from "@/lib/price-breakdown";
import { formatPrice } from "@/lib/shopify/utils";

/** Les Millerands-style fractional öre (legacy catalog). */
const MILLERANDS_ORE = 29326;
/** La Souteronne whole-kronor öre. */
const SOUTERONNE_ORE = 31000;

describe("integer-cents B2C price — PLP / PDP / checkout / breakdown", () => {
  it("29326 öre → 293 on shared helper, getProductListPriceSek, formatPrice (PLP)", () => {
    expect(b2cWholeKronorFromOre(MILLERANDS_ORE)).toBe(293);
    expect(
      getProductListPriceSek({
        priceBreakdown: { basePriceCents: MILLERANDS_ORE },
      }),
    ).toBe(293);
    // Former bug: cents/100=293.26 then Math.ceil → 294
    expect(Math.ceil(MILLERANDS_ORE / 100)).toBe(294);
    expect(formatPrice(293, "SEK", "sv-SE").replace(/\u00a0/g, " ")).toMatch(
      /293/,
    );
    expect(formatPrice(293.26, "SEK", "sv-SE").replace(/\u00a0/g, " ")).toMatch(
      /293/,
    );
  });

  it("31000 öre → 310 (never 311)", () => {
    expect(b2cWholeKronorFromOre(SOUTERONNE_ORE)).toBe(310);
    expect(
      getProductListPriceSek({
        priceBreakdown: { basePriceCents: SOUTERONNE_ORE },
      }),
    ).toBe(310);
  });

  it("PDP calculatePriceBreakdown total is binding integer; parts sum exactly", () => {
    for (const [ore, sek] of [
      [MILLERANDS_ORE, 293],
      [SOUTERONNE_ORE, 310],
    ] as const) {
      const breakdown = calculatePriceBreakdown({
        cost_amount: 12.5,
        exchange_rate: 11.25,
        alcohol_tax_cents: 555,
        margin_percentage: 45,
        base_price_cents: ore,
      });
      expect(breakdown.listTotalInclVat).toBe(sek);
      expect(breakdown.total).toBe(sek);
      const partsSum = Math.round(
        (breakdown.cost +
          breakdown.alcoholTax +
          breakdown.margin +
          breakdown.vat) *
          100,
      );
      expect(partsSum).toBe(sek * 100);
    }
  });

  it("float-epsilon regression: reconstructed parts never become 310.01 / 294.01", () => {
    // Inputs that previously left |diff| just under 0.01 so correction skipped.
    const cases = [
      { ore: SOUTERONNE_ORE, sek: 310 },
      { ore: MILLERANDS_ORE, sek: 293 },
      { ore: 29400, sek: 294 },
    ];
    for (const { ore, sek } of cases) {
      for (const fx of [11.25, 11.3, 11.47, 12.0]) {
        for (const tax of [0, 555, 700, 833]) {
          const b = calculatePriceBreakdown({
            cost_amount: 14.2,
            exchange_rate: fx,
            alcohol_tax_cents: tax,
            margin_percentage: 42.5,
            base_price_cents: ore,
          });
          expect(b.total).toBe(sek);
          expect(Number.isInteger(b.total)).toBe(true);
          expect(b.total).not.toBeCloseTo(sek + 0.01, 10);
        }
      }
    }
  });

  it("checkout line: 29326 × qty uses whole-kronor unit", () => {
    const { unitSek, lineTotalSek } = b2cLineTotalSekFromOre({
      listUnitOre: MILLERANDS_ORE,
      memberPercent: 0,
      earlyBirdTier: 0,
      quantity: 2,
    });
    expect(unitSek).toBe(293);
    expect(lineTotalSek).toBe(586);
  });

  it("checkout line: 31000 × 2 = 620", () => {
    const { unitSek, lineTotalSek } = b2cLineTotalSekFromOre({
      listUnitOre: SOUTERONNE_ORE,
      memberPercent: 0,
      earlyBirdTier: 0,
      quantity: 2,
    });
    expect(unitSek).toBe(310);
    expect(lineTotalSek).toBe(620);
  });

  it("PDP display path prefers listPriceSek over reconstructed total", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "app/product/[handle]/components/product-price-display.tsx",
      ),
      "utf8",
    );
    expect(src).toMatch(/listPriceSek \?\? breakdown\.listTotalInclVat/);
    expect(src).toMatch(/Never ceil a reconstructed float total/);
  });

  it("decompose uses integer öre (no Math.ceil on reconstructed total)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/price-breakdown.ts"),
      "utf8",
    );
    expect(src).toMatch(/totalOre = totalSek \* 100/);
    expect(src).toMatch(/total: totalSek/);
    expect(src).not.toMatch(
      /let calculatedTotal = Math\.ceil\(\s*\(cost \+ alcoholTax/,
    );
  });
});
