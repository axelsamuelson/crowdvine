import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { b2cLineTotalSek } from "@/lib/cart/b2c-line-pricing";
import { b2cWholeKronorFromOre } from "@/lib/cart/b2c-line-pricing";

/**
 * Cart drawer vs checkout wine parity.
 * Review case: Synthetic Résiste base_price_cents=10700 → list 107 kr × 6 = 642
 * with early-bird 20% → unit 86 × 6 = 516 (checkout wine) + 99 shipping = 615.
 */
describe("cart add responses include early-bird (parity with checkout)", () => {
  it("simple-add and add-quantity do not skip early-bird on getCart", () => {
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

  it("early-bird 20% turns list 107×6=642 into charged wine 516", () => {
    const listUnitSek = b2cWholeKronorFromOre(10700);
    expect(listUnitSek).toBe(107);
    const listTotal = listUnitSek * 6;
    expect(listTotal).toBe(642);

    const { unitSek, lineTotalSek } = b2cLineTotalSek({
      listUnitSek,
      memberPercent: 0,
      earlyBirdTier: 20,
      quantity: 6,
    });
    expect(unitSek).toBe(86);
    expect(lineTotalSek).toBe(516);
    expect(lineTotalSek + 99).toBe(615);
  });
});
