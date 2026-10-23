import { describe, expect, it } from "vitest";
import { LEGACY_SHOP_REDIRECT_SLUGS } from "@/lib/wine-shop-filter-categories";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";

describe("direct-import category removal", () => {
  it("no longer resolves as shop categories", () => {
    expect(getWineCategorySv("direktimport-vin")).toBeUndefined();
    expect(getWineCategoryEn("direct-import-wine")).toBeUndefined();
  });

  it("is listed among legacy shop redirect slugs (sitemap exclusion)", () => {
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("direktimport-vin")).toBe(true);
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("direct-import-wine")).toBe(true);
  });

  it("Languedoc long-tail filters use producers.region", () => {
    expect(getWineCategorySv("naturvin-languedoc")?.filter).toEqual({
      region: "Languedoc",
    });
    expect(getWineCategorySv("rott-naturvin-languedoc")?.filter).toEqual({
      color: ["Red"],
      region: "Languedoc",
    });
    expect(getWineCategoryEn("natural-wine-languedoc")?.filter).toEqual({
      region: "Languedoc",
    });
  });
});
