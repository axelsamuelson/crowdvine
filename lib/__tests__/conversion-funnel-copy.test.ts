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
      "Lådor om 6 flaskor – blanda i samma låda.",
    );
    expect(
      translate("sv", "cart.bottleProgressFull", {
        current: 6,
        total: 6,
        boxes: 1,
      }),
    ).toBe("6 av 6 flaskor – 1 låda");
    expect(
      translate("sv", "cart.bottleProgressFull", {
        current: 12,
        total: 12,
        boxes: 2,
      }),
    ).toBe("12 av 12 flaskor – 2 lådor");
    expect(translate("sv", "cart.bottlesCount", { count: 1 })).toBe("1 flaska");
    expect(translate("sv", "cart.bottlesCount", { count: 2 })).toBe("2 flaskor");
    expect(translate("sv", "cart.addMoreBottlesOutlineCta", { needed: 4 })).toBe(
      "+ Lägg till 4 flaskor till",
    );
    expect(translate("sv", "cart.addMoreBottlesOutlineCta", { needed: 1 })).toBe(
      "+ Lägg till 1 flaska till",
    );
    expect(translate("sv", "cart.needMoreMixHint", { needed: 4 })).toBe(
      "4 flaskor till för en full låda.",
    );
    expect(translate("sv", "cart.needMoreMixHint", { needed: 1 })).toBe(
      "1 flaska till för en full låda.",
    );
    expect(translate("sv", "cart.checkoutLockedCta")).toBe(
      "Fyll dina lådor för att gå vidare",
    );
    expect(translate("sv", "cart.fullBoxesSummary", { full: 1, total: 2 })).toBe(
      "Fulla lådor: 1 av 2",
    );
    expect(translate("sv", "cart.whyPopoverBody")).toMatch(/lådor om 6/);
    expect(translate("sv", "cart.whyPopoverBody")).not.toMatch(/grossist/i);
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

  it("promises direct-box delivery with Axel-approved window (5–10 working days)", () => {
    expect(translate("sv", "commerce.directBoxDeliveryPromise")).toBe(
      "Direktleverans – 5–10 arbetsdagar",
    );
    expect(B2C_DIRECT_BOX_DELIVERY_TIME_TODO).toBe("5–10 arbetsdagar");
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
    expect(translate("sv", "cart.mixFreelyCart")).not.toMatch(/grossist/i);
    expect(translate("sv", "cart.sixBottleRuleInfo")).toMatch(/lådor om 6/i);
    expect(translate("sv", "cart.sixBottleRuleInfo")).not.toMatch(/grossist/i);
  });

  it("names wholesaler boxes as Blandlåda från region", () => {
    expect(
      translate("sv", "cart.addMoreFromWholesalerCta", {
        needed: 4,
        region: "Languedoc",
      }),
    ).toBe("Lägg till 4 flaskor till i Blandlåda från Languedoc");
    expect(
      translate("sv", "cart.addMoreFromProducerCta", {
        needed: 4,
        name: "Domaine Test",
      }),
    ).toBe(
      "Lägg till 4 flaskor till från Domaine Test för en full låda.",
    );
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
    expect(translate("en", "commerce.minSixMix")).toBe(
      "Boxes of 6 bottles – mix in the same box.",
    );
    expect(
      translate("en", "cart.bottleProgressFull", {
        current: 6,
        total: 6,
        boxes: 1,
      }),
    ).toBe("6 of 6 bottles – 1 box");
    expect(translate("en", "cart.bottlesCount", { count: 1 })).toBe("1 bottle");
    expect(translate("en", "cart.bottlesCount", { count: 2 })).toBe("2 bottles");
    expect(translate("en", "commerce.directBoxDeliveryPromise")).toBe(
      "Direct delivery – 5–10 working days",
    );
    expect(translate("en", "cart.checkoutLockedCta")).toBe(
      "Complete your boxes to continue",
    );
    expect(translate("en", "cart.whyPopoverBody")).not.toMatch(/wholesaler/i);
    const intro = getShopRootNaturalWineContent("en").intro;
    expect(intro).toContain("delivered to your door when the pallet closes");
    expect(intro).not.toMatch(/Stockholm|Budbee/i);
  });
});
