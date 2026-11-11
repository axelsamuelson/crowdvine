import { describe, expect, it } from "vitest";
import { validateCartMinimum } from "@/lib/checkout-validation";
import { B2C_CART_MIN_BOTTLES } from "@/lib/cart/cart-minimum";

describe("checkout cart-minimum gate (6-per-source B2C)", () => {
  it("rejects a 2-bottle cart that still has lines", () => {
    const result = validateCartMinimum(
      [
        {
          id: "line-1",
          quantity: 2,
          merchandise: {
            id: "w1",
            product: {
              id: "w1",
              producerId: "p1",
              producerName: "Test",
              sourceType: "producer",
            },
          },
        },
      ],
      { channel: "b2c" },
    );
    expect(result.isValid).toBe(false);
    expect(result.neededTotal).toBe(4);
    expect(result.quantity).toBe(2);
    expect(B2C_CART_MIN_BOTTLES).toBe(6);
  });

  it("rejects 2+4 across two producers (each source incomplete)", () => {
    const result = validateCartMinimum(
      [
        {
          id: "line-1",
          quantity: 2,
          merchandise: {
            id: "w1",
            product: {
              id: "w1",
              producerId: "p1",
              producerName: "A",
              sourceType: "producer",
            },
          },
        },
        {
          id: "line-2",
          quantity: 4,
          merchandise: {
            id: "w2",
            product: {
              id: "w2",
              producerId: "p2",
              producerName: "B",
              sourceType: "producer",
            },
          },
        },
      ],
      { channel: "b2c" },
    );
    expect(result.isValid).toBe(false);
    expect(result.neededTotal).toBe(6); // 4 + 2
  });

  it("accepts mixed 6 from the same producer", () => {
    const result = validateCartMinimum(
      [
        {
          id: "line-1",
          quantity: 2,
          merchandise: {
            id: "w1",
            product: {
              id: "w1",
              producerId: "p1",
              producerName: "A",
              sourceType: "producer",
            },
          },
        },
        {
          id: "line-2",
          quantity: 4,
          merchandise: {
            id: "w2",
            product: {
              id: "w2",
              producerId: "p1",
              producerName: "A",
              sourceType: "producer",
            },
          },
        },
      ],
      { channel: "b2c" },
    );
    expect(result.isValid).toBe(true);
    expect(result.neededTotal).toBe(0);
  });
});
