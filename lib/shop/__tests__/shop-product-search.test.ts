import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/shopify/types";
import {
  filterAndRankProductsBySearch,
  foldShopSearchText,
  scoreProductAgainstSearchQuery,
  tokenizeShopSearch,
} from "@/lib/shop/shop-product-search";

function wine(partial: Partial<Product> & Pick<Product, "id" | "title">): Product {
  return {
    handle: partial.handle ?? partial.title.toLowerCase().replace(/\s+/g, "-"),
    description: "",
    descriptionHtml: "",
    featuredImage: { url: "", altText: "", height: 0, width: 0 },
    currencyCode: "SEK",
    priceRange: {
      minVariantPrice: { amount: "100", currencyCode: "SEK" },
      maxVariantPrice: { amount: "100", currencyCode: "SEK" },
    },
    seo: { title: partial.title, description: "" },
    options: [
      {
        id: "color",
        name: "Color",
        values: [{ id: "c1", name: "Red" }],
      },
      {
        id: "grape",
        name: "Grape Varieties",
        values: [{ id: "g1", name: "Carignan" }],
      },
    ],
    tags: ["Carignan", "Red"],
    variants: [],
    images: [],
    availableForSale: true,
    producerName: "Clos Fantine",
    farming: "natural",
    ...partial,
  };
}

describe("shop-product-search", () => {
  it("folds accents for matching", () => {
    expect(foldShopSearchText("Révolte")).toBe("revolte");
    expect(foldShopSearchText("rött")).toBe("rott");
  });

  it("tokenizes multi-word queries", () => {
    expect(tokenizeShopSearch("  Clos, Fantine  ")).toEqual(["clos", "fantine"]);
  });

  it("matches producer name with accents ignored", () => {
    const products = [
      wine({ id: "1", title: "La Rêvolte Rouge 2023", producerName: "La Revolte" }),
      wine({ id: "2", title: "Punkahontas 2023", producerName: "Ugo Lestelle" }),
    ];
    const hits = filterAndRankProductsBySearch(products, "revolte");
    expect(hits.map((p) => p.id)).toEqual(["1"]);
  });

  it("requires all tokens (AND) across fields", () => {
    const products = [
      wine({
        id: "1",
        title: "Courtiol 2022",
        producerName: "Clos Fantine",
        options: [
          {
            id: "color",
            name: "Color",
            values: [{ id: "c1", name: "Red" }],
          },
          {
            id: "grape",
            name: "Grape Varieties",
            values: [{ id: "g1", name: "Carignan" }],
          },
        ],
      }),
      wine({
        id: "2",
        title: "White is Blanc 2023",
        producerName: "Gregory White",
        options: [
          {
            id: "color",
            name: "Color",
            values: [{ id: "c1", name: "White" }],
          },
        ],
        tags: ["White"],
      }),
    ];

    const hits = filterAndRankProductsBySearch(products, "fantine carignan");
    expect(hits.map((p) => p.id)).toEqual(["1"]);
  });

  it("matches Swedish color synonyms", () => {
    const products = [
      wine({ id: "1", title: "Red Wine", tags: ["Red"] }),
      wine({
        id: "2",
        title: "White Wine",
        tags: ["White"],
        options: [
          {
            id: "color",
            name: "Color",
            values: [{ id: "c1", name: "White" }],
          },
        ],
      }),
    ];
    const hits = filterAndRankProductsBySearch(products, "rött");
    expect(hits.map((p) => p.id)).toEqual(["1"]);
  });

  it("ranks title matches above soft description matches", () => {
    const exact = wine({ id: "exact", title: "Kairos 2024" });
    const soft = wine({
      id: "soft",
      title: "Other Wine",
      description: "A wine for Kairos lovers",
    });
    expect(scoreProductAgainstSearchQuery(exact, "kairos")).toBeGreaterThan(
      scoreProductAgainstSearchQuery(soft, "kairos"),
    );
  });

  it("scopes wine tab to title/handle only", () => {
    const products = [
      wine({ id: "1", title: "Courtiol 2022", producerName: "Clos Fantine" }),
      wine({ id: "2", title: "Fantine Style 2024", producerName: "Other" }),
    ];
    expect(
      filterAndRankProductsBySearch(products, "fantine", "wine").map((p) => p.id),
    ).toEqual(["2"]);
    expect(
      filterAndRankProductsBySearch(products, "fantine", "producer").map(
        (p) => p.id,
      ),
    ).toEqual(["1"]);
  });

  it("scopes grape tab to grape varieties", () => {
    const products = [
      wine({
        id: "1",
        title: "Rouge",
        producerName: "A",
        options: [
          {
            id: "grape",
            name: "Grape Varieties",
            values: [{ id: "g1", name: "Carignan" }],
          },
        ],
        tags: ["Carignan"],
      }),
      wine({
        id: "2",
        title: "Carignan Night",
        producerName: "B",
        options: [
          {
            id: "grape",
            name: "Grape Varieties",
            values: [{ id: "g1", name: "Grenache" }],
          },
        ],
        tags: ["Grenache"],
      }),
    ];
    expect(
      filterAndRankProductsBySearch(products, "carignan", "grape").map(
        (p) => p.id,
      ),
    ).toEqual(["1"]);
    expect(
      filterAndRankProductsBySearch(products, "carignan", "wine").map(
        (p) => p.id,
      ),
    ).toEqual(["2"]);
  });
});
