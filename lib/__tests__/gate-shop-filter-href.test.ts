import { describe, expect, it } from "vitest";

import { gateShopFilterHref } from "@/lib/shop/gate-shop-filter-href";
import { isNavigableShopFilterPath } from "@/lib/shop/shop-filter-category-availability";

describe("gateShopFilterHref", () => {
  const navigable = [
    "/wine",
    "/wine/red-natural-wine",
    "/wine/red-organic-wine",
    "/wine/organic-wine",
  ];

  it("keeps clear hrefs even when not checking emptiness for clear", () => {
    expect(
      gateShopFilterHref("/wine/red-natural-wine", {
        isClear: true,
        navigablePaths: navigable,
      }),
    ).toBe("/wine/red-natural-wine");
  });

  it("drops select hrefs that are not in the navigable set", () => {
    expect(
      gateShopFilterHref("/wine/red-biodynamic-wine", {
        isClear: false,
        navigablePaths: navigable,
      }),
    ).toBeNull();
  });

  it("keeps select hrefs that have products", () => {
    expect(
      gateShopFilterHref("/wine/red-organic-wine", {
        isClear: false,
        navigablePaths: navigable,
      }),
    ).toBe("/wine/red-organic-wine");
  });

  it("fails open when navigable paths were not provided", () => {
    expect(
      gateShopFilterHref("/wine/red-biodynamic-wine", {
        isClear: false,
      }),
    ).toBe("/wine/red-biodynamic-wine");
  });
});

describe("isNavigableShopFilterPath", () => {
  it("matches paths from the availability list", () => {
    expect(
      isNavigableShopFilterPath("/wine/red-natural-wine", [
        "/wine",
        "/wine/red-natural-wine",
      ]),
    ).toBe(true);
    expect(
      isNavigableShopFilterPath("/wine/white-biodynamic-wine", [
        "/wine",
        "/wine/red-natural-wine",
      ]),
    ).toBe(false);
  });
});
