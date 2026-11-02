import { describe, expect, it } from "vitest";

import { filterProductsByRegions } from "@/lib/shop/filter-products-by-region";
import { applyShopUrlFilters } from "@/lib/shop/apply-shop-url-filters";
import { countActiveShopFilters } from "@/lib/shop/filter-count-server";
import type { Product } from "@/lib/shopify/types";
import {
  countLiveWinesByRegionValue,
  getLinkableWineRegions,
  getLinkableWineRegionsFromProducts,
  isWineRegionLinkable,
  parseWineRegionParam,
  serializeWineRegionParam,
} from "@/lib/wine-regions";

function wine(partial: Partial<Product> & { id: string; region?: string | null }): Product {
  return {
    title: partial.title ?? partial.id,
    handle: partial.handle ?? partial.id,
    description: "",
    descriptionHtml: "",
    featuredImage: { url: "", altText: "", width: 1, height: 1 },
    currencyCode: "SEK",
    priceRange: {
      minVariantPrice: { amount: "100", currencyCode: "SEK" },
      maxVariantPrice: { amount: "100", currencyCode: "SEK" },
    },
    seo: { title: "", description: "" },
    options: [],
    tags: [],
    variants: [],
    images: [],
    availableForSale: true,
    ...partial,
  };
}

describe("parseWineRegionParam / serializeWineRegionParam", () => {
  it("parses comma-separated and repeated params", () => {
    expect(parseWineRegionParam("loire,jura")).toEqual(["loire", "jura"]);
    expect(parseWineRegionParam(["jura", "loire,alsace"])).toEqual([
      "jura",
      "loire",
      "alsace",
    ]);
    expect(parseWineRegionParam("jura,loire,jura")).toEqual(["jura", "loire"]);
  });

  it("drops invalid slugs and normalizes case", () => {
    expect(parseWineRegionParam("Loire,fake,RHONE")).toEqual(["loire", "rhone"]);
    expect(parseWineRegionParam("")).toEqual([]);
    expect(parseWineRegionParam(undefined)).toEqual([]);
  });

  it("serializes unique alphabetical slugs", () => {
    expect(serializeWineRegionParam(["jura", "loire", "jura"])).toBe(
      "jura,loire",
    );
    expect(serializeWineRegionParam(["loire", "jura"])).toBe("jura,loire");
    expect(serializeWineRegionParam([])).toBeNull();
    expect(serializeWineRegionParam(["nope"])).toBeNull();
  });
});

describe("linkable wine regions helper", () => {
  it("returns only regions with ≥1 live wine", () => {
    const counts = new Map<string, number>([
      ["Languedoc", 91],
      ["Loire", 8],
      ["Jura", 0],
      ["Champagne", 0],
    ]);
    const linkable = getLinkableWineRegions(counts);
    expect(linkable.map((r) => r.slug).sort()).toEqual(["languedoc", "loire"]);
    expect(isWineRegionLinkable("jura", counts)).toBe(false);
    expect(isWineRegionLinkable("loire", counts)).toBe(true);
    expect(isWineRegionLinkable("Languedoc", counts)).toBe(true);
  });

  it("derives from product list and ignores NULL regions", () => {
    const products = [
      wine({ id: "1", region: "Loire" }),
      wine({ id: "2", region: "Loire" }),
      wine({ id: "3", region: null }),
      wine({ id: "4", region: "Beaujolais" }),
      wine({ id: "5" }),
    ];
    expect(countLiveWinesByRegionValue(products).get("Loire")).toBe(2);
    expect(
      getLinkableWineRegionsFromProducts(products).map((r) => r.slug).sort(),
    ).toEqual(["beaujolais", "loire"]);
  });
});

describe("filterProductsByRegions", () => {
  const catalog = [
    wine({ id: "a", region: "Loire" }),
    wine({ id: "b", region: "Jura" }),
    wine({ id: "c", region: null }),
    wine({ id: "d", region: "Languedoc" }),
  ];

  it("OR-filters by region slug and excludes NULL when filter active", () => {
    const filtered = filterProductsByRegions(catalog, ["loire", "jura"]);
    expect(filtered.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("returns all products (incl. NULL region) when no filter", () => {
    expect(filterProductsByRegions(catalog, [])).toHaveLength(4);
  });
});

describe("applyShopUrlFilters region param", () => {
  const catalog = [
    wine({ id: "a", region: "Loire" }),
    wine({ id: "b", region: "Jura" }),
    wine({ id: "c", region: null }),
  ];

  it("filters on comma-separated region param", () => {
    const out = applyShopUrlFilters(catalog, { region: "loire,jura" });
    expect(out.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("counts region filters with comma split", () => {
    expect(countActiveShopFilters({ region: "loire,jura" })).toBe(2);
    expect(countActiveShopFilters({ region: "loire", fcolor: "Red" })).toBe(2);
  });
});
