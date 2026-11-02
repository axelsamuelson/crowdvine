import { describe, expect, it } from "vitest";

import type { Product } from "@/lib/shopify/types";
import {
  formatGrapeListLabel,
  grapesFromProducts,
  grapesLookingLikeTypos,
  normalizeWineFactKey,
  stylesFromProducts,
} from "@/lib/wine-region-page-facts";

function product(partial: {
  grapes?: string[];
  color?: string;
}): Product {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Wine",
    handle: "wine",
    description: "",
    descriptionHtml: "",
    featuredImage: { url: "", altText: "", width: 1, height: 1 },
    currencyCode: "SEK",
    priceRange: {
      minVariantPrice: { amount: "100", currencyCode: "SEK" },
      maxVariantPrice: { amount: "100", currencyCode: "SEK" },
    },
    seo: { title: "", description: "" },
    options: [
      {
        id: "grape-varieties",
        name: "Grape Varieties",
        values: (partial.grapes ?? []).map((name) => ({
          id: name,
          name,
        })),
      },
      {
        id: "color",
        name: "Color",
        values: partial.color
          ? [{ id: partial.color, name: partial.color }]
          : [],
      },
    ],
    tags: [],
    variants: [],
    images: [],
    availableForSale: true,
  };
}

describe("normalizeWineFactKey", () => {
  it("strips diacritics and case", () => {
    expect(normalizeWineFactKey("Mourvèdre")).toBe("mourvedre");
    expect(normalizeWineFactKey("Rött")).toBe("rott");
  });
});

describe("stylesFromProducts", () => {
  it("dedupes normalized style labels", () => {
    const products = [
      product({ color: "Red" }),
      product({ color: "Rött" }),
      product({ color: "rott" }),
      product({ color: "White" }),
      product({ color: "Vitt" }),
    ];
    expect(stylesFromProducts(products, "sv")).toEqual(["Rött", "Vitt"]);
    expect(stylesFromProducts(products, "en")).toEqual(["Red", "White"]);
  });
});

describe("grapesFromProducts", () => {
  it("merges diacritic / synonym variants and caps the list", () => {
    const products = [
      product({ grapes: ["Syrah", "Carignan"] }),
      product({ grapes: ["Shiraz", "Mourvedre"] }),
      product({ grapes: ["Mourvèdre", "Rousanne"] }),
      product({ grapes: ["Roussanne", "Massanne"] }),
      ...Array.from({ length: 15 }, (_, i) =>
        product({ grapes: [`Grape${i}`] }),
      ),
    ];
    const list = grapesFromProducts(products, 12);
    expect(list.allLabels).toContain("Syrah");
    expect(list.allLabels.filter((g) => g === "Syrah")).toHaveLength(1);
    expect(list.allLabels).toContain("Mourvèdre");
    expect(list.allLabels).toContain("Roussanne");
    expect(list.allLabels).not.toContain("Shiraz");
    expect(list.allLabels).not.toContain("Mourvedre");
    expect(list.allLabels).not.toContain("Rousanne");
    expect(list.labels).toHaveLength(12);
    expect(list.moreCount).toBeGreaterThan(0);
    expect(formatGrapeListLabel(list, "sv")).toMatch(/och \d+ till$/);
  });

  it("collapses Syrah/Shiraz compound labels into Syrah", () => {
    const list = grapesFromProducts([
      product({ grapes: ["Syrah"] }),
      product({ grapes: ["Syrah/Shiraz"] }),
      product({ grapes: ["Shiraz"] }),
    ]);
    expect(list.allLabels).toEqual(["Syrah"]);
  });

  it("reports Massanne as a typo suspect without rewriting it away from the list if unique", () => {
    const suspects = grapesLookingLikeTypos(["Massanne", "Carignan"]);
    expect(suspects).toEqual([{ raw: "Massanne", hint: "Marsanne?" }]);
  });
});
