import { describe, expect, it } from "vitest";
import { validateCartMinimum } from "@/lib/checkout-validation";
import { B2C_CART_MIN_BOTTLES } from "@/lib/cart/cart-minimum";

describe("checkout cart-minimum gate (6-bottle B2C)", () => {
  it("rejects a 2-bottle cart that still has lines", () => {
    const result = validateCartMinimum(
      [
        {
          id: "line-1",
          quantity: 2,
          merchandise: {
            id: "w1",
            product: { id: "p1", producerName: "Test" },
          },
        },
      ],
      { channel: "b2c" },
    );
    expect(result.isValid).toBe(false);
    expect(result.requiredQuantity).toBe(B2C_CART_MIN_BOTTLES);
    expect(result.neededTotal).toBe(4);
    expect(result.quantity).toBe(2);
  });

  it("accepts a mixed 6-bottle cart", () => {
    const result = validateCartMinimum(
      [
        {
          id: "line-1",
          quantity: 2,
          merchandise: {
            id: "w1",
            product: { id: "p1", producerName: "A" },
          },
        },
        {
          id: "line-2",
          quantity: 4,
          merchandise: {
            id: "w2",
            product: { id: "p2", producerName: "B" },
          },
        },
      ],
      { channel: "b2c" },
    );
    expect(result.isValid).toBe(true);
    expect(result.neededTotal).toBe(0);
  });
});
