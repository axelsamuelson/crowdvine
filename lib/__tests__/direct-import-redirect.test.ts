import { describe, expect, it } from "vitest";
import { LEGACY_SHOP_REDIRECT_SLUGS } from "@/lib/wine-shop-filter-categories";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";

describe("legacy shop category redirects", () => {
  it("direct-import pages no longer resolve as shop categories", () => {
    expect(getWineCategorySv("direktimport-vin")).toBeUndefined();
    expect(getWineCategoryEn("direct-import-wine")).toBeUndefined();
  });

  it("lists direct-import and Languedoc slugs for sitemap exclusion", () => {
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("direktimport-vin")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("direct-import-wine")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("naturvin-languedoc")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("rott-naturvin-languedoc")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("natural-wine-languedoc")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("red-natural-wine-languedoc")).toBe(
      true,
    );
  });

  it("Languedoc long-tail pages no longer resolve as shop categories", () => {
    expect(getWineCategorySv("naturvin-languedoc")).toBeUndefined();
    expect(getWineCategorySv("rott-naturvin-languedoc")).toBeUndefined();
    expect(getWineCategorySv("vitt-naturvin-languedoc")).toBeUndefined();
    expect(getWineCategorySv("orange-naturvin-languedoc")).toBeUndefined();
    expect(getWineCategoryEn("natural-wine-languedoc")).toBeUndefined();
    expect(getWineCategoryEn("red-natural-wine-languedoc")).toBeUndefined();
    expect(getWineCategoryEn("white-natural-wine-languedoc")).toBeUndefined();
    expect(getWineCategoryEn("orange-natural-wine-languedoc")).toBeUndefined();
  });
});
