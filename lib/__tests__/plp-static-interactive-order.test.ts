import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/app/vin/components/product-card";
import { ProductGrid } from "@/app/vin/components/product-grid";
import { ProductListStaticGrid } from "@/app/vin/components/product-list-static-grid";
import type { Product } from "@/lib/shopify/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vin/naturvin-languedoc",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ collection: "naturvin-languedoc" }),
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) =>
    createElement("img", { alt: props.alt ?? "" }),
}));

function wine(index: number): Product {
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
  } as Product;
}

function cardHandles(html: string): string[] {
  const handles = [...html.matchAll(/href="\/produkt\/([^"]+)"/g)].map(
    (match) => match[1],
  );
  return handles.filter((handle, index) => handle !== handles[index - 1]);
}

describe("PLP static and interactive lists", () => {
  it("renders the same cards in the same order when there are no query parameters", () => {
    const products = [3, 1, 2].map((index) => wine(index));

    const staticHtml = renderToStaticMarkup(
      createElement(ProductListStaticGrid, { products, locale: "sv" }),
    );
    const interactiveHtml = renderToStaticMarkup(
      createElement(ProductGrid, {
        children: products.map((product, index) =>
          createElement(ProductCard, {
            key: product.id,
            product,
            index,
          }),
        ),
      }),
    );

    const expected = products.map((product) => product.handle);
    expect(cardHandles(staticHtml)).toEqual(expected);
    expect(cardHandles(interactiveHtml)).toEqual(expected);
    expect(staticHtml.match(/data-plp-card=/g)).toBeNull();
    expect(interactiveHtml.match(/data-plp-card=/g)).toHaveLength(products.length);
  });
});
