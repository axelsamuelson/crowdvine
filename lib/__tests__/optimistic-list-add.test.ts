import { afterEach, describe, expect, it, vi } from "vitest";

import { beginOptimisticCaseAdd } from "@/lib/cart/optimistic-case-cart";
import type { Product, ProductVariant } from "@/lib/shopify/types";

const product = {
  id: "wine-1",
  title: "Test Wine 2024",
  handle: "test-wine-2024",
  description: "",
  descriptionHtml: "",
  productType: "wine",
  categoryId: "",
  options: [],
  variants: [],
  priceRange: {
    minVariantPrice: { amount: "150", currencyCode: "SEK" },
    maxVariantPrice: { amount: "150", currencyCode: "SEK" },
  },
  featuredImage: { id: "img", url: "/x.jpg", altText: "t", width: 1, height: 1 },
  images: [],
  seo: { title: "", description: "" },
  tags: [],
  availableForSale: true,
  currencyCode: "SEK",
  updatedAt: "",
  createdAt: "",
} as Product;

const variant = {
  id: "wine-1-default",
  title: "750 ml",
  availableForSale: true,
  selectedOptions: [],
  price: { amount: "150", currencyCode: "SEK" },
} as ProductVariant;

describe("list Köp optimistic open", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls requestCartOpen before add-quantity resolves", async () => {
    const order: string[] = [];
    vi.stubGlobal("window", {
      dispatchEvent(event: Event) {
        order.push(event.type);
        return true;
      },
    });

    let resolveFetch: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    let settled = false;
    const resultPromise = beginOptimisticCaseAdd({
      previous: undefined,
      product,
      variant,
      quantity: 6,
      timeoutMessage: "timeout",
      onCart: () => order.push("cart"),
      fetchAdd: () => {
        order.push("fetch");
        return pending;
      },
    });
    void resultPromise.then(() => {
      settled = true;
    });

    expect(order[0]).toBe("cart");
    expect(order.indexOf("cart-open-request")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("cart-open-request")).toBeLessThan(order.indexOf("fetch"));
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveFetch(
      new Response(JSON.stringify({ cart: { id: "db", lines: [], totalQuantity: 6 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await resultPromise;
    expect(result.ok).toBe(true);
    expect(settled).toBe(true);
  });
});
