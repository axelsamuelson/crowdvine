import { describe, expect, it } from "vitest";
import {
  B2C_CART_MIN_BOTTLES,
  cartMinimumTrackingMeta,
  computeB2BPackMinimum,
  computeB2CCartMinimum,
  sumCartBottles,
} from "@/lib/cart/cart-minimum";
import {
  validateCartMinimum,
  type CartItem,
} from "@/lib/checkout-validation";

function line(
  id: string,
  quantity: number,
  producer?: { id: string; name: string },
): CartItem {
  return {
    id: `cart-${id}`,
    quantity,
    merchandise: {
      id,
      product: {
        id,
        producerId: producer?.id,
        producerName: producer?.name,
      },
    },
  };
}

describe("B2C cart minimum (total across any wines)", () => {
  it("exports the documented floor of 6", () => {
    expect(B2C_CART_MIN_BOTTLES).toBe(6);
  });

  it("sums bottles across mixed wines and producers", () => {
    expect(
      sumCartBottles([
        { quantity: 2 },
        { quantity: 1 },
        { quantity: 3 },
      ]),
    ).toBe(6);
  });

  it("passes when 6 bottles are split across several wines/producers", () => {
    // Evidence reproduction: 6 bottles across several wines must pass B2C.
    const items = [
      line("w1", 2, { id: "p1", name: "Domaine A" }),
      line("w2", 1, { id: "p2", name: "Domaine B" }),
      line("w3", 2, { id: "p3", name: "Domaine C" }),
      line("w4", 1, { id: "p4", name: "Domaine D" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(true);
    expect(result.quantity).toBe(6);
    expect(result.requiredQuantity).toBe(6);
    expect(result.neededTotal).toBe(0);
    expect(result.producerValidations).toHaveLength(1);
    expect(result.producerValidations[0].scope).toBe("cart");
  });

  it("does not sum per-producer floors (old bug: required 12 / missing 10)", () => {
    // Two producers × 1 bottle: old rule required 6+6=12 and needed 5+5=10.
    const items = [
      line("w1", 1, { id: "p1", name: "Alpha" }),
      line("w2", 1, { id: "p2", name: "Beta" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(false);
    expect(result.quantity).toBe(2);
    expect(result.requiredQuantity).toBe(6);
    expect(result.neededTotal).toBe(4);
    // Must NOT look like the old per-producer sum.
    expect(result.requiredQuantity).not.toBe(12);
    expect(result.neededTotal).not.toBe(10);

    const meta = cartMinimumTrackingMeta({
      channel: "b2c",
      quantity: result.quantity,
      required: result.requiredQuantity,
      needed: result.neededTotal,
      isValid: result.isValid,
    });
    expect(meta.required_quantity).toBe(6);
    expect(meta.needed_total).toBe(4);
  });

  it("does not multiply producer minima (old bug: required 24 / missing 18)", () => {
    // Four producers totaling 6 bottles: old rule required 24 and needed 18.
    const items = [
      line("w1", 2, { id: "p1", name: "A" }),
      line("w2", 1, { id: "p2", name: "B" }),
      line("w3", 2, { id: "p3", name: "C" }),
      line("w4", 1, { id: "p4", name: "D" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(true);
    expect(result.requiredQuantity).toBe(6);
    expect(result.neededTotal).toBe(0);
    expect(result.requiredQuantity).not.toBe(24);
    expect(result.neededTotal).not.toBe(18);
  });

  it("allows more than 6 and odd totals above the floor", () => {
    expect(computeB2CCartMinimum(7).isValid).toBe(true);
    expect(computeB2CCartMinimum(7).needed).toBe(0);
    expect(computeB2CCartMinimum(11).isValid).toBe(true);
  });

  it("fails below 6 with correct missing count", () => {
    const progress = computeB2CCartMinimum(5);
    expect(progress.isValid).toBe(false);
    expect(progress.needed).toBe(1);
    expect(progress.required).toBe(6);
  });

  it("treats empty cart as valid (nothing to block yet)", () => {
    const result = validateCartMinimum([], { channel: "b2c" });
    expect(result.isValid).toBe(true);
    expect(result.producerValidations).toEqual([]);
  });
});

describe("B2B pack minimum (explicit bottle-pack rule)", () => {
  it("accepts pack-sized lines from mixed producers", () => {
    const items = [
      line("w1", 6, { id: "p1", name: "Alpha" }),
      line("w2", 12, { id: "p2", name: "Beta" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2b" });
    expect(result.isValid).toBe(true);
    expect(result.neededTotal).toBe(0);
    expect(result.producerValidations.every((v) => v.scope === "line")).toBe(
      true,
    );
  });

  it("rejects 1–2 bottle B2B carts (September dirtywine evidence)", () => {
    const items = [
      line("w1", 1, { id: "p1", name: "Alpha" }),
      line("w2", 1, { id: "p2", name: "Beta" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2b" });
    expect(result.isValid).toBe(false);
    // Each line must reach a 6-pack → 5 + 5 missing.
    expect(result.neededTotal).toBe(10);
    expect(result.requiredQuantity).toBe(12);
    expect(result.producerValidations).toHaveLength(2);
  });

  it("rejects a single non-pack line", () => {
    const { progress, lines } = computeB2BPackMinimum([
      { id: "w1", quantity: 2, producerName: "Solo" },
    ]);
    expect(progress.isValid).toBe(false);
    expect(progress.needed).toBe(4);
    expect(lines[0].required).toBe(6);
  });

  it("does not apply B2C cart-total semantics to B2B", () => {
    // Six bottles as 1+1+1+1+1+1 would pass B2C but must fail B2B packs.
    const items = Array.from({ length: 6 }, (_, i) =>
      line(`w${i}`, 1, { id: `p${i}`, name: `P${i}` }),
    );
    expect(validateCartMinimum(items, { channel: "b2c" }).isValid).toBe(true);
    expect(validateCartMinimum(items, { channel: "b2b" }).isValid).toBe(false);
  });
});

describe("counter and validation share tracking meta", () => {
  it("exposes required_quantity and needed_total for cart_validation_failed", () => {
    const progress = computeB2CCartMinimum(3);
    const meta = cartMinimumTrackingMeta(progress, { invalidCount: 1 });
    expect(meta).toEqual({
      required_quantity: 6,
      needed_total: 3,
      invalid_count: 1,
    });
  });
});
