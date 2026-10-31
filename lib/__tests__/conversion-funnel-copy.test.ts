import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/messages";
import { B2C_DIRECT_BOX_DELIVERY_TIME_TODO } from "@/lib/commerce/direct-box-delivery";

describe("conversion funnel copy (sv)", () => {
  it("exposes Reservera CTA and min-six mix hint", () => {
    expect(translate("sv", "shop.reserve")).toBe("Reservera");
    expect(translate("sv", "shop.addCase")).toBe("Reservera");
    expect(translate("sv", "commerce.minSixMix")).toBe(
      "Minst 6 flaskor per låda, blanda fritt",
    );
    expect(translate("sv", "shop.viewWine")).toBe("Visa vin");
    expect(translate("sv", "product.addToCart")).toBe("Lägg i varukorg");
  });

  it("promises direct-box delivery without inventing a time SLA", () => {
    expect(translate("sv", "commerce.directBoxDeliveryPromise")).toBe(
      "Skickas direkt från producenten i låda",
    );
    // Customer copy must not invent delivery times; only a marked TODO may set one.
    expect(B2C_DIRECT_BOX_DELIVERY_TIME_TODO).toBeNull();
  });

  it("explains how many more bottles are needed", () => {
    expect(
      translate("sv", "cart.addMoreBottles", { needed: 3 }),
    ).toBe("Lägg till 3 flaskor till för att gå till kassan");
    expect(
      translate("sv", "cart.bottleProgress", { current: 3, total: 6 }),
    ).toBe("3 av 6 flaskor");
    expect(
      translate("sv", "cart.needMoreBottlesShort", { needed: 2 }),
    ).toBe("2 flaskor till");
    expect(translate("sv", "cart.mixFreelyCart")).toMatch(/blanda/i);
    expect(translate("sv", "cart.sixBottleRuleInfo")).toMatch(/totalt|blanda/i);
  });

  it("has progressive delivery field hints", () => {
    expect(translate("sv", "checkout.postalCodeInvalid")).toMatch(/5/);
    expect(
      translate("sv", "checkout.nextFieldHint", { label: "E-post" }),
    ).toBe("Nästa: E-post");
  });
});

describe("conversion funnel copy (en)", () => {
  it("mirrors reserve + min-six + direct-box messaging", () => {
    expect(translate("en", "shop.reserve")).toBe("Reserve");
    expect(translate("en", "commerce.minSixMix")).toMatch(/6/);
    expect(translate("en", "commerce.directBoxDeliveryPromise")).toMatch(
      /producer/i,
    );
  });
});
