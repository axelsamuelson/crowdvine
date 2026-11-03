import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ProductsProvider } from "@/components/shop/products-provider";
import type { ProductData } from "@/lib/crowdvine/products-data";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: () => null,
  })),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    notFound: () => {
      throw new Error("notFound");
    },
    permanentRedirect: (url: string) => {
      throw new Error(`redirect:${url}`);
    },
    usePathname: () => "/vin/naturvin-languedoc",
    useParams: () => ({ collection: "naturvin-languedoc" }),
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({
      push: () => undefined,
      replace: () => undefined,
      refresh: () => undefined,
    }),
  };
});

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) =>
    createElement("img", { alt: props.alt ?? "" }),
}));

vi.mock("@/lib/crowdvine/products-data", () => ({
  fetchProductsData: vi.fn(),
  catalogHasProducts: vi.fn(),
}));

vi.mock("@/lib/external-prices/cached-source-slugs", () => ({
  getCachedAllWineSourceSlugs: vi.fn(async () => ({})),
  pickWineSourceSlugsForProducts: () => ({}),
}));

import VinCollectionPage from "@/app/vin/[collection]/page";
import { fetchProductsData } from "@/lib/crowdvine/products-data";

function wine(index: number): ProductData {
  return {
    id: `wine-${index}`,
    title: `Wine ${index}`,
    description: "",
    handle: `wine-${index}`,
    productType: "wine",
    categoryId: "",
    producerId: "producer-1",
    producerName: "Domaine Test",
    options: [],
    variants: [],
    priceRange: {
      minVariantPrice: { amount: "190", currencyCode: "SEK" },
      maxVariantPrice: { amount: "190", currencyCode: "SEK" },
    },
    priceBreakdown: { basePriceCents: 19000 },
    featuredImage: {
      id: `img-${index}`,
      url: "/placeholder.png",
      altText: `Wine ${index}`,
      width: 600,
      height: 600,
    },
    images: [],
    seo: { title: `Wine ${index}`, description: "" },
    tags: [],
    availableForSale: true,
    currencyCode: "SEK",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("category PLP server HTML", () => {
  beforeEach(() => {
    vi.mocked(fetchProductsData).mockReset();
  });

  it("links every product handle before JavaScript, including past the first eight", async () => {
    const products = Array.from({ length: 9 }, (_, index) => wine(index + 1));
    vi.mocked(fetchProductsData).mockResolvedValue(products);

    const page = await VinCollectionPage({
      params: Promise.resolve({ collection: "naturvin-languedoc" }),
    });
    const html = renderToStaticMarkup(
      createElement(
        NuqsTestingAdapter,
        null,
        createElement(ProductsProvider, {
          initialServerResultsCount: products.length,
          children: page,
        }),
      ),
    );

    for (const product of products) {
      expect(html).toContain(`href="/produkt/${product.handle}"`);
    }
    expect(html.match(/href="\/produkt\/wine-\d+"/g)).toHaveLength(products.length);
  });
});
