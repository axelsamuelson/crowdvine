import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { translate } from "@/lib/i18n/messages";

describe("customer PDP price breakdown hides margin/markup", () => {
  it("does not push a margin bar or table row", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/product/price-breakdown.tsx"),
      "utf8",
    );
    // buildBreakdownRows must not add a customer-visible margin segment.
    expect(src).toMatch(/Customer-facing: never show margin/);
    expect(src).not.toMatch(
      /barSegments[\s\S]*lineKey: "margin", amount: margin/,
    );
    expect(src).not.toMatch(
      /tableRows[\s\S]*lineKey: "margin",\s*\n\s*amount: margin/,
    );
  });

  it("intro copy omits marginal / business margin (SV + EN)", () => {
    const sv = translate("sv", "product.pdp.priceBreakdownIntro", {
      shipping: ", frakt",
      memberDiscount: ".",
    });
    const en = translate("en", "product.pdp.priceBreakdownIntro", {
      shipping: ", shipping",
      memberDiscount: ".",
    });
    expect(sv).toBe(
      "Så här är priset uppbyggt: flaskkostnad, alkoholskatt, frakt, moms.",
    );
    expect(en).toBe(
      "This is how the price is made up: bottle cost, alcohol tax, shipping, VAT.",
    );
    expect(sv).not.toMatch(/marginal|påslag|markup/i);
    expect(en).not.toMatch(/margin|markup|påslag/i);
    expect(translate("sv", "product.pdp.lineBottleCost")).toBe("Flaskkostnad");
    expect(translate("sv", "product.pdp.lineAlcoholTax")).toBe("Alkoholskatt");
    expect(translate("sv", "product.pdp.lineShipping")).toBe("Frakt");
    expect(translate("sv", "product.pdp.lineVat")).toBe("Moms");
    expect(translate("en", "product.pdp.lineBottleCost")).toBe("Bottle cost");
    expect(translate("en", "product.pdp.lineAlcoholTax")).toBe("Alcohol tax");
    expect(translate("en", "product.pdp.lineShipping")).toBe("Shipping");
    expect(translate("en", "product.pdp.lineVat")).toBe("VAT");
  });
});
