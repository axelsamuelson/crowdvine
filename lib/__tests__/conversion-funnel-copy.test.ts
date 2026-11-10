import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/messages";
import {
  B2C_DIRECT_BOX_DELIVERY_TIME_TODO,
  isProducerSourcedWine,
} from "@/lib/commerce/direct-box-delivery";
import { getShopRootNaturalWineContent } from "@/lib/shop/shop-root-natural-wine-content";

describe("conversion funnel copy (sv)", () => {
  it("exposes Köp on PDP/PLP keys; addCase adds to cart; Dirty Wine keeps Reservera", () => {
    expect(translate("sv", "shop.buy")).toBe("Köp");
    expect(translate("sv", "shop.reserve")).toBe("Köp");
    expect(translate("sv", "shop.addCase")).toBe("Lägg i varukorgen");
    expect(translate("sv", "shop.reserveDirty")).toBe("Reservera");
    expect(translate("sv", "commerce.minSixMix")).toBe(
      "Minst 6 flaskor per order – blanda fritt mellan vinerna.",
    );
    expect(translate("sv", "cart.bottleProgressFull", { current: 6, total: 6 })).toBe(
      "6 av 6 flaskor – lådan är full",
    );
    expect(translate("sv", "cart.bottlesCount", { count: 1 })).toBe("1 flaska");
    expect(translate("sv", "cart.bottlesCount", { count: 2 })).toBe("2 flaskor");
    expect(translate("sv", "cart.addMoreBottlesOutlineCta", { needed: 4 })).toBe(
      "+ Lägg till 4 flaskor till",
    );
    expect(translate("sv", "cart.addMoreBottlesOutlineCta", { needed: 1 })).toBe(
      "+ Lägg till 1 flaska till",
    );
    expect(translate("sv", "cart.needMoreMixHint", { needed: 4 })).toBe(
      "4 flaskor till – blanda fritt mellan vinerna.",
    );
    expect(translate("sv", "cart.needMoreMixHint", { needed: 1 })).toBe(
      "1 flaska till – blanda fritt mellan vinerna.",
    );
  });

  it("uses Margaux PLP intro without Stockholm / Budbee", () => {
    const intro = getShopRootNaturalWineContent("sv").intro;
    expect(intro).toContain("levereras hem till dig när pallen stänger");
    expect(intro).not.toMatch(/Stockholm|Budbee/i);
    expect(getShopRootNaturalWineContent("sv").longDescription).toMatch(
      /skickas den hem till dig\.?$/,
    );
    expect(getShopRootNaturalWineContent("en").longDescription).toMatch(
      /ships to your door\.?$/,
    );
  });

  it("promises direct-box delivery without inventing a time SLA", () => {
    expect(translate("sv", "commerce.directBoxDeliveryPromise")).toBe(
      "Skickas direkt från producenten i låda",
    );
    // Customer copy must not invent delivery times; only a marked TODO may set one.
    expect(B2C_DIRECT_BOX_DELIVERY_TIME_TODO).toBeNull();
    expect(isProducerSourcedWine("producer")).toBe(true);
    expect(isProducerSourcedWine("wholesaler")).toBe(false);
    expect(isProducerSourcedWine(null)).toBe(false);
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
  it("mirrors buy + add-to-cart + min-six + direct-box messaging", () => {
    expect(translate("en", "shop.buy")).toBe("Buy");
    expect(translate("en", "shop.reserve")).toBe("Buy");
    expect(translate("en", "shop.addCase")).toBe("Add to cart");
    expect(translate("en", "shop.reserveDirty")).toBe("Reserve");
    expect(translate("en", "commerce.minSixMix")).toMatch(/Minimum 6 bottles per order/i);
    expect(translate("en", "cart.bottleProgressFull", { current: 6, total: 6 })).toMatch(
      /your case is full/i,
    );
    expect(translate("en", "cart.bottlesCount", { count: 1 })).toBe("1 bottle");
    expect(translate("en", "cart.bottlesCount", { count: 2 })).toBe("2 bottles");
    expect(translate("en", "commerce.directBoxDeliveryPromise")).toMatch(
      /producer/i,
    );
    const intro = getShopRootNaturalWineContent("en").intro;
    expect(intro).toContain("delivered to your door when the pallet closes");
    expect(intro).not.toMatch(/Stockholm|Budbee/i);
  });
});
