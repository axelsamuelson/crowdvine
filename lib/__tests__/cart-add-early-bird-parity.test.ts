import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { b2cLineTotalSek } from "@/lib/cart/b2c-line-pricing";
import { b2cWholeKronorFromOre } from "@/lib/cart/b2c-line-pricing";

/**
 * Cart drawer vs checkout wine parity.
 * CFO 2026-11-10: early-bird + member discounts default OFF → full list price.
 * Same path: CartService.getCart → computeExpectedAmountOre → charge.
 */
describe("cart / checkout / charge parity at full list price (discounts off)", () => {
  it("simple-add and add-quantity use full getCart (shared price path)", () => {
    const simpleAdd = readFileSync(
      resolve(process.cwd(), "app/api/cart/simple-add/route.ts"),
      "utf8",
    );
    const addQuantity = readFileSync(
      resolve(process.cwd(), "app/api/cart/add-quantity/route.ts"),
      "utf8",
    );
    expect(simpleAdd).not.toMatch(/skipEarlyBird\s*:\s*true/);
    expect(addQuantity).not.toMatch(/skipEarlyBird\s*:\s*true/);
    expect(simpleAdd).toMatch(/CartService\.getCart\(/);
    expect(addQuantity).toMatch(/CartService\.getCart\(/);
  });

  it("with tiers/member at 0: 107×6=642 list equals charged wine", () => {
    const listUnitSek = b2cWholeKronorFromOre(10700);
    expect(listUnitSek).toBe(107);

    const { unitSek, lineTotalSek } = b2cLineTotalSek({
      listUnitSek,
      memberPercent: 0,
      earlyBirdTier: 0,
      quantity: 6,
    });
    expect(unitSek).toBe(107);
    expect(lineTotalSek).toBe(642);
    expect(lineTotalSek + 99).toBe(741);
  });
});
