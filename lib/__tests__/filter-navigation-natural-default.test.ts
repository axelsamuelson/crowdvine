import { describe, expect, it } from "vitest";

import { resolveShopFilterNavigationUrl } from "@/lib/shop/filter-navigation";
import {
  findShopFilterCategory,
  GENERATED_WINE_CATEGORIES_EN,
  GENERATED_WINE_CATEGORIES_SV,
  LEGACY_SHOP_REDIRECT_SLUGS,
} from "@/lib/wine-shop-filter-categories";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";
import { resolveNaturalWineColorCategoryLink } from "@/lib/shop/natural-wine-color-category-link";

describe("natural wine as shop default", () => {
  it("maps color from root to natural color pages", () => {
    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine",
        nextColorUi: "Red",
      }),
    ).toBe("/wine/red-natural-wine");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin",
        nextColorUi: "White",
      }),
    ).toBe("/vin/vitt-naturvin");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine",
        nextColorUi: "Orange",
      }),
    ).toBe("/wine/orange-natural-wine");
  });

  it("keeps organic/biodynamic as real filters on color pages", () => {
    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine/red-natural-wine",
        nextFarming: "organic_certified",
      }),
    ).toBe("/wine/red-organic-wine");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine/red-organic-wine",
        clearFarming: true,
      }),
    ).toBe("/wine/red-natural-wine");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/rott-ekologiskt-vin",
        clearColor: true,
      }),
    ).toBe("/vin/ekologiskt-vin");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine/red-natural-wine",
        clearColor: true,
      }),
    ).toBe("/wine");
  });

  it("maps farming from root without forcing natural", () => {
    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine",
        nextFarming: "organic_certified",
      }),
    ).toBe("/wine/organic-wine");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine/organic-wine",
        clearFarming: true,
      }),
    ).toBe("/wine");
  });

  it("lists all wines of a color on primary natural pages", () => {
    const redNatural = findShopFilterCategory(
      "en",
      "Red",
      null,
      GENERATED_WINE_CATEGORIES_EN,
    );
    expect(redNatural?.slug).toBe("red-natural-wine");
    expect(redNatural?.filter).toEqual({ color: ["Red"] });
    expect(redNatural?.filter.farming).toBeUndefined();

    const whiteNatural = getWineCategorySv("vitt-naturvin");
    expect(whiteNatural?.filter).toEqual({ color: ["White"] });
  });

  it("keeps two-color natural pages on farming natural", () => {
    const blend = GENERATED_WINE_CATEGORIES_EN.find(
      (c) => c.slug === "red-and-white-natural-wine",
    );
    expect(blend?.filter).toEqual({
      color: ["Red & White"],
      farming: ["natural"],
    });
  });

  it("marks legacy color and natural hubs for redirect only", () => {
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("red-wine")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("natural-wine")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("red-natural-wine")).toBe(false);

    expect(getWineCategoryEn("red-wine")?.slug).toBe("red-wine");
    expect(getWineCategorySv("naturvin")?.slug).toBe("naturvin");
  });

  it("shows PDP color links for Red/White/Orange regardless of farming", () => {
    expect(
      resolveNaturalWineColorCategoryLink("en", {
        color: "Red",
        farming: "organic_certified",
      })?.href,
    ).toBe("/wine/red-natural-wine");

    expect(
      resolveNaturalWineColorCategoryLink("sv", {
        color: "Orange",
        farming: "biodynamic_certified",
      })?.href,
    ).toBe("/vin/orange-naturvin");

    expect(
      resolveNaturalWineColorCategoryLink("en", {
        color: "Red & White",
        farming: "natural",
      }),
    ).toBeNull();
  });
});
