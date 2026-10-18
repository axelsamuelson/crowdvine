import { describe, expect, it } from "vitest";

import { gateShopFilterHref } from "@/lib/shop/gate-shop-filter-href";
import { resolveShopFilterNavigationUrl } from "@/lib/shop/filter-navigation";

/**
 * Documents the server→client prop contract:
 * ShopLayoutShell computes navigableShopPaths (catalogHasProducts + B2B),
 * passes them into DesktopFilters/MobileFilters, which gate hrefs here.
 *
 * Counts mirror live curl (dirtywine red-organic=5; empty combos omitted).
 */
describe("navigableShopPaths prop gating (dirtywine vs pact)", () => {
  const dirtywinePaths = [
    "/wine",
    "/vin",
    "/wine/red-natural-wine",
    "/wine/red-organic-wine",
    "/wine/red-biodynamic-wine",
    "/wine/white-natural-wine",
    "/wine/orange-natural-wine",
    "/wine/organic-wine",
    // intentionally no white-biodynamic / orange-biodynamic (0 cards on dirtywine)
  ];

  const pactPaths = [
    "/wine",
    "/vin",
    "/wine/red-natural-wine",
    "/wine/white-natural-wine",
    "/wine/orange-natural-wine",
    "/wine/organic-wine",
    "/wine/biodynamic-wine",
    "/wine/red-organic-wine",
    "/wine/red-biodynamic-wine",
    "/wine/white-organic-wine",
    "/wine/white-biodynamic-wine",
    "/wine/orange-organic-wine",
    "/wine/orange-biodynamic-wine",
  ];

  it("dirtywine red-natural-wine: Organic links, empty combos do not", () => {
    const organic = resolveShopFilterNavigationUrl({
      locale: "en",
      currentPath: "/wine/red-natural-wine",
      nextFarming: "organic_certified",
    });
    const whiteBiodynamic = resolveShopFilterNavigationUrl({
      locale: "en",
      currentPath: "/wine/white-natural-wine",
      nextFarming: "biodynamic_certified",
    });

    expect(organic).toBe("/wine/red-organic-wine");
    expect(
      gateShopFilterHref(organic, {
        isClear: false,
        navigablePaths: dirtywinePaths,
      }),
    ).toBe("/wine/red-organic-wine");

    expect(whiteBiodynamic).toBe("/wine/white-biodynamic-wine");
    expect(
      gateShopFilterHref(whiteBiodynamic, {
        isClear: false,
        navigablePaths: dirtywinePaths,
      }),
    ).toBeNull();
  });

  it("pact root: all primary color natural hrefs stay navigable", () => {
    for (const color of ["Red", "White", "Orange"] as const) {
      const url = resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine",
        nextColorUi: color,
      });
      expect(
        gateShopFilterHref(url, {
          isClear: false,
          navigablePaths: pactPaths,
        }),
      ).toMatch(/\/wine\/(red|white|orange)-natural-wine$/);
    }
  });

  it("pact red-natural-wine: Organic and Biodynamic both link", () => {
    for (const farming of [
      "organic_certified",
      "biodynamic_certified",
    ] as const) {
      const url = resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine/red-natural-wine",
        nextFarming: farming,
      });
      expect(
        gateShopFilterHref(url, {
          isClear: false,
          navigablePaths: pactPaths,
        }),
      ).not.toBeNull();
    }
  });
});
