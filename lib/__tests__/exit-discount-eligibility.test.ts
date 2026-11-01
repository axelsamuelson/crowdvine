import { describe, expect, it } from "vitest";
import {
  cartHasMemberOrEarlyBirdDiscount,
  isExitDiscountOrderInScope,
  normalizeEmail,
} from "@/lib/exit-discount/eligibility";
import {
  filterExitDiscountEligibleItems,
  sumPromoItemsSek,
} from "@/lib/exit-discount/exclusions";
import type { Cart } from "@/lib/shopify/types";

function cartWithLine(opts: {
  hasDiscount?: boolean;
  discountLabel?: string;
  originalUnitPriceSek?: number;
  lineTotal?: number;
  qty?: number;
}): Cart {
  const qty = opts.qty ?? 2;
  const lineTotal = opts.lineTotal ?? 200;
  return {
    id: "c1",
    checkoutUrl: "/checkout",
    totalQuantity: qty,
    cost: {
      subtotalAmount: { amount: String(lineTotal), currencyCode: "SEK" },
      totalAmount: { amount: String(lineTotal), currencyCode: "SEK" },
      totalTaxAmount: { amount: "0", currencyCode: "SEK" },
    },
    lines: [
      {
        id: "l1",
        quantity: qty,
        cost: { totalAmount: { amount: String(lineTotal), currencyCode: "SEK" } },
        discountLabel: opts.discountLabel,
        merchandise: {
          id: "wine-1",
          title: "Test",
          selectedOptions: [],
          product: {
            id: "wine-1",
            title: "Test",
            handle: "test",
            description: "",
            descriptionHtml: "",
            productType: "wine",
            categoryId: "",
            options: [],
            variants: [],
            priceRange: {
              minVariantPrice: { amount: "100", currencyCode: "SEK" },
              maxVariantPrice: { amount: "100", currencyCode: "SEK" },
            },
            featuredImage: {
              id: "i",
              url: "",
              altText: "",
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
            hasDiscount: opts.hasDiscount,
            originalUnitPriceSek: opts.originalUnitPriceSek,
          },
        },
      },
    ],
  };
}

describe("exit-discount eligibility", () => {
  it("detects member/early-bird via hasDiscount and discountLabel", () => {
    expect(cartHasMemberOrEarlyBirdDiscount(cartWithLine({}))).toBe(false);
    expect(
      cartHasMemberOrEarlyBirdDiscount(
        cartWithLine({ hasDiscount: true }),
      ),
    ).toBe(true);
    expect(
      cartHasMemberOrEarlyBirdDiscount(
        cartWithLine({ discountLabel: "Privilege 10%" }),
      ),
    ).toBe(true);
    expect(
      cartHasMemberOrEarlyBirdDiscount(
        cartWithLine({
          originalUnitPriceSek: 150,
          lineTotal: 200,
          qty: 2,
        }),
      ),
    ).toBe(true);
  });

  it("scope all always allows; pallet_only requires pallet", () => {
    expect(
      isExitDiscountOrderInScope({
        scope: "all",
        palletId: null,
        fulfillmentChannel: "direct_box",
      }),
    ).toBe(true);
    expect(
      isExitDiscountOrderInScope({
        scope: "pallet_only",
        palletId: "p1",
        fulfillmentChannel: null,
      }),
    ).toBe(true);
    expect(
      isExitDiscountOrderInScope({
        scope: "pallet_only",
        palletId: "p1",
        fulfillmentChannel: "direct_box",
      }),
    ).toBe(false);
    expect(
      isExitDiscountOrderInScope({
        scope: "pallet_only",
        palletId: null,
        fulfillmentChannel: null,
      }),
    ).toBe(false);
  });

  it("normalizes email", () => {
    expect(normalizeEmail("  A@B.com ")).toBe("a@b.com");
  });

  it("filters excluded wines from discount base", () => {
    const items = [
      { wine_id: "dde4e61c-ef3a-461b-beca-0eb8f5d60cd3", quantity: 3, unit_price: 156 },
      { wine_id: "other-wine", quantity: 2, unit_price: 100 },
    ];
    const excluded = new Set(["dde4e61c-ef3a-461b-beca-0eb8f5d60cd3"]);
    const eligible = filterExitDiscountEligibleItems(items, excluded);
    expect(eligible).toEqual([
      { wine_id: "other-wine", quantity: 2, unit_price: 100 },
    ]);
    expect(sumPromoItemsSek(eligible)).toBe(200);
  });
});
