import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  resolveShopFilterNavigationUrl,
  withShopFilterSearchParams,
} from "@/lib/shop/filter-navigation";
import { COLOR_MAP } from "@/lib/constants";

describe("shop filter navigation hrefs (natural default)", () => {
  it("resolves color and farming category URLs for report cases", () => {
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
        nextColorUi: "Red",
      }),
    ).toBe("/vin/rott-naturvin");

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

    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine/red-natural-wine",
        clearColor: true,
      }),
    ).toBe("/wine");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "en",
        currentPath: "/wine/red-organic-wine",
        clearColor: true,
      }),
    ).toBe("/wine/organic-wine");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/rott-naturvin",
        nextFarming: "organic_certified",
      }),
    ).toBe("/vin/rott-ekologiskt-vin");

    expect(
      resolveShopFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/rott-ekologiskt-vin",
        clearFarming: true,
      }),
    ).toBe("/vin/rott-naturvin");
  });

  it("preserves region and other query params on colour select and clear", () => {
    const redPath = resolveShopFilterNavigationUrl({
      locale: "sv",
      currentPath: "/vin",
      nextColorUi: "Red",
    });
    expect(withShopFilterSearchParams(redPath, "region=loire")).toBe(
      "/vin/rott-naturvin?region=loire",
    );
    expect(
      withShopFilterSearchParams(
        redPath,
        new URLSearchParams("region=loire&sort=price-asc"),
      ),
    ).toBe("/vin/rott-naturvin?region=loire&sort=price-asc");

    const clearPath = resolveShopFilterNavigationUrl({
      locale: "sv",
      currentPath: "/vin/rott-naturvin",
      clearColor: true,
    });
    expect(withShopFilterSearchParams(clearPath, "region=loire")).toBe(
      "/vin?region=loire",
    );

    const enPath = resolveShopFilterNavigationUrl({
      locale: "en",
      currentPath: "/wine",
      nextColorUi: "Red",
    });
    expect(withShopFilterSearchParams(enPath, "?region=loire")).toBe(
      "/wine/red-natural-wine?region=loire",
    );

    // Path-only when no active query filters (canonical colour URLs unchanged).
    expect(withShopFilterSearchParams(redPath, "")).toBe("/vin/rott-naturvin");
    expect(withShopFilterSearchParams(redPath, null)).toBe("/vin/rott-naturvin");
  });

  it("renders color swatches as <a href> when category URLs are provided", () => {
    const red = { name: "Red", value: COLOR_MAP.red };
    const html = renderToStaticMarkup(
      createElement(ColorPicker, {
        colors: [red],
        selectedColors: [],
        onColorChange: () => {},
        getColorHref: (color) => {
          const name = Array.isArray(color) ? color[0].name : color.name;
          return name === "Red" ? "/wine/red-natural-wine" : null;
        },
      }),
    );

    expect(html).toContain('href="/wine/red-natural-wine"');
    expect(html).toContain('aria-label="Select color: Red"');
    expect(html).not.toMatch(/<button[^>]*aria-label="Select color: Red"/);
  });

  it("renders visible swatch labels when showLabels is set (mobile sheet)", () => {
    const red = { name: "Red", value: COLOR_MAP.red };
    const html = renderToStaticMarkup(
      createElement(ColorPicker, {
        colors: [red],
        selectedColors: [],
        onColorChange: () => {},
        formatDisplayName: () => "Rött",
        selectColorAria: (name) => `Välj färg: ${name}`,
        showLabels: true,
      }),
    );

    expect(html).toContain("Rött");
    expect(html).toContain('aria-label="Välj färg: Rött"');
    expect(html).not.toContain("sr-only");
  });
});

