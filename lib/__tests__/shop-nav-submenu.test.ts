import { describe, expect, it } from "vitest";

import { SHOP_ROOT_LABEL } from "@/lib/nav/shop-root-label";
import {
  SHOP_NAV_SUBMENU_EN,
  SHOP_NAV_SUBMENU_SV,
} from "@/lib/nav/shop-submenu";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";

describe("shop nav submenu", () => {
  it("lists the Swedish categories in order", () => {
    expect(SHOP_NAV_SUBMENU_SV.map((link) => [link.label, link.href])).toEqual([
      ["Rött naturvin", "/vin/rott-naturvin"],
      ["Vitt naturvin", "/vin/vitt-naturvin"],
      ["Orange vin", "/vin/orange-naturvin"],
      ["Mousserande vin", "/vin/mousserande-vin"],
      ["Pet nat", "/vin/pet-nat"],
      ["Naturvinslåda", "/vin/naturvin-lada"],
    ]);
    expect(SHOP_ROOT_LABEL.sv).toBe("Alla naturviner");
  });

  it("lists the English categories on the live slugs", () => {
    expect(SHOP_NAV_SUBMENU_EN.map((link) => [link.label, link.href])).toEqual([
      ["Red natural wine", "/wine/red-natural-wine"],
      ["White natural wine", "/wine/white-natural-wine"],
      ["Orange wine", "/wine/orange-natural-wine"],
      ["Sparkling wine", "/wine/sparkling-wine"],
      ["Pet nat", "/wine/pet-nat"],
      ["Natural wine box", "/wine/natural-wine-box"],
    ]);
    expect(SHOP_ROOT_LABEL.en).toBe("All natural wines");
  });

  it("resolves every wine category slug", () => {
    for (const link of SHOP_NAV_SUBMENU_SV) {
      if (!link.slug) continue;
      expect(getWineCategorySv(link.slug)?.slug).toBe(link.slug);
    }
    for (const link of SHOP_NAV_SUBMENU_EN) {
      if (!link.slug) continue;
      expect(getWineCategoryEn(link.slug)?.slug).toBe(link.slug);
    }
  });
});
