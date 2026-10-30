import { describe, expect, it } from "vitest";
import { buildOptimisticCaseCart } from "@/lib/cart/optimistic-case-cart";
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
  featuredImage: {
    id: "img",
    url: "/x.jpg",
    altText: "t",
    width: 1,
    height: 1,
  },
  images: [],
  seo: { title: "", description: "" },
  tags: [],
  availableForSale: true,
  currencyCode: "SEK",
  updatedAt: "",
  createdAt: "",
  producerName: "Producer",
} as Product;

const variant = {
  id: "wine-1-default",
  title: "750 ml",
  availableForSale: true,
  selectedOptions: [],
  price: { amount: "150", currencyCode: "SEK" },
} as ProductVariant;

describe("buildOptimisticCaseCart", () => {
  it("adds a 6-pack line to an empty cart", () => {
    const cart = buildOptimisticCaseCart(undefined, product, variant, 6);
    expect(cart.totalQuantity).toBe(6);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.merchandise.id).toBe("wine-1");
    expect(cart.lines[0]?.quantity).toBe(6);
    expect(cart.cost.totalAmount.amount).toBe("900");
  });

  it("increments an existing line", () => {
    const first = buildOptimisticCaseCart(undefined, product, variant, 6);
    const second = buildOptimisticCaseCart(first, product, variant, 6);
    expect(second.lines).toHaveLength(1);
    expect(second.totalQuantity).toBe(12);
    expect(second.cost.totalAmount.amount).toBe("1800");
  });
});
