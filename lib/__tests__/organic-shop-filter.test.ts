import { describe, expect, it } from "vitest";

import {
  countProductsByFarming,
  filterProductsByFarming,
  productQualifiesForOrganicShopFilter,
} from "@/lib/shop/farming-filter";
import type { Product } from "@/lib/shopify/types";

function wine(
  partial: Partial<Product> & Pick<Product, "id" | "title" | "handle">,
): Product {
  return {
    description: "",
    descriptionHtml: "",
    featuredImage: { url: "", altText: "", width: 1, height: 1 },
    currencyCode: "SEK",
    priceRange: {
      minVariantPrice: { amount: "100", currencyCode: "SEK" },
      maxVariantPrice: { amount: "100", currencyCode: "SEK" },
    },
    seo: { title: partial.title, description: "" },
    options: [],
    tags: [],
    variants: [],
    images: [],
    availableForSale: true,
    ...partial,
  };
}

describe("organic shop filter verification", () => {
  it("keeps organic_certified wines from seed-verified producers (pre-migration)", () => {
    const product = wine({
      id: "1",
      title: "Dolce Vita 2022",
      handle: "dolce-vita-2022",
      farming: "organic_certified",
      producerName: "Julien Peyras",
    });
    expect(productQualifiesForOrganicShopFilter(product)).toBe(true);
  });

  it("drops Gregory White, Hors Saison, Ugo Lestelle without registry URL", () => {
    for (const producerName of [
      "Gregory White",
      "Hors Saison",
      "Ugo Lestelle",
    ]) {
      expect(
        productQualifiesForOrganicShopFilter(
          wine({
            id: producerName,
            title: "x",
            handle: "x",
            farming: "organic_certified",
            producerName,
          }),
        ),
      ).toBe(false);
    }
  });

  it("drops Meigoon when marked in conversion with registry URL", () => {
    expect(
      productQualifiesForOrganicShopFilter(
        wine({
          id: "m",
          title: "Jardin",
          handle: "jardin",
          farming: "organic_certified",
          producerName: "Meigoon",
          producerCertificationVerifiedUrl:
            "https://certificat.ecocert.com/entreprise/AFFACF70-4072-4674-842F-F1C730B01493",
          producerCertificationInConversion: true,
        }),
      ),
    ).toBe(false);
  });

  it("includes verified organic URL when not in conversion", () => {
    expect(
      productQualifiesForOrganicShopFilter(
        wine({
          id: "j",
          title: "Dolce Vita",
          handle: "dolce",
          farming: "organic_certified",
          producerName: "Julien Peyras",
          producerCertificationVerifiedUrl:
            "https://certificat.ecocert.com/entreprise/5BB6C793-C442-4E0E-B40A-591CECC6C01E",
          producerCertificationInConversion: false,
        }),
      ),
    ).toBe(true);
  });

  it("does not treat biodynamic farming as organic filter match", () => {
    expect(
      productQualifiesForOrganicShopFilter(
        wine({
          id: "b",
          title: "Symbiose",
          handle: "symbiose",
          farming: "biodynamic_certified",
          producerName: "Mas Des Mesures",
          producerCertificationVerifiedUrl:
            "https://bio.certipaq.solutions/certificats/fiche/56136/auge-vincent/",
        }),
      ),
    ).toBe(false);
  });

  it("filters and counts organic facet with verification rules", () => {
    const products = [
      wine({
        id: "keep",
        title: "Keep",
        handle: "keep",
        farming: "organic_certified",
        producerName: "Julien Peyras",
      }),
      wine({
        id: "drop",
        title: "Drop",
        handle: "drop",
        farming: "organic_certified",
        producerName: "Ugo Lestelle",
      }),
      wine({
        id: "bio",
        title: "Bio",
        handle: "bio",
        farming: "biodynamic_certified",
        producerName: "Mas Des Mesures",
      }),
    ];
    expect(filterProductsByFarming(products, ["organic_certified"])).toHaveLength(
      1,
    );
    expect(countProductsByFarming(products).get("organic_certified")).toBe(1);
    expect(countProductsByFarming(products).get("biodynamic_certified")).toBe(1);
  });
});
