import { describe, expect, it } from "vitest";
import {
  B2C_CART_MIN_BOTTLES,
  cartMinimumTrackingMeta,
  computeB2BPackMinimum,
  computeB2CPackingMinimum,
  sumCartBottles,
} from "@/lib/cart/cart-minimum";
import {
  validateCartMinimum,
  type CartItem,
} from "@/lib/checkout-validation";

function line(
  id: string,
  quantity: number,
  opts?: {
    producerId?: string;
    producerName?: string;
    sourceType?: string;
    sourceName?: string;
  },
): CartItem {
  return {
    id: `cart-${id}`,
    quantity,
    merchandise: {
      id,
      product: {
        id,
        producerId: opts?.producerId,
        producerName: opts?.producerName,
        sourceType: opts?.sourceType ?? "producer",
        sourceName: opts?.sourceName,
      },
    },
  };
}

describe("B2C packing minimum (multiples of 6 per source)", () => {
  it("exports pack size of 6", () => {
    expect(B2C_CART_MIN_BOTTLES).toBe(6);
  });

  it("sums bottles across lines", () => {
    expect(
      sumCartBottles([{ quantity: 2 }, { quantity: 1 }, { quantity: 3 }]),
    ).toBe(6);
  });

  it("passes when one producer has mixed wines totaling 6", () => {
    const items = [
      line("w1", 2, { producerId: "p1", producerName: "Domaine A" }),
      line("w2", 4, { producerId: "p1", producerName: "Domaine A" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(true);
    expect(result.quantity).toBe(6);
    expect(result.neededTotal).toBe(0);
    expect(result.producerValidations).toHaveLength(1);
    expect(result.producerValidations[0]!.scope).toBe("source");
  });

  it("fails when two producers each have 3 (need 3+3 more)", () => {
    const items = [
      line("w1", 3, { producerId: "p1", producerName: "Alpha" }),
      line("w2", 3, { producerId: "p2", producerName: "Beta" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(false);
    expect(result.quantity).toBe(6);
    expect(result.neededTotal).toBe(6);
    expect(result.producerValidations).toHaveLength(2);
    expect(result.producerValidations.every((v) => v.needed === 3)).toBe(true);
  });

  it("fails on 7 bottles from one producer (not a multiple of 6)", () => {
    const items = [
      line("w1", 7, { producerId: "p1", producerName: "Alpha" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(false);
    expect(result.neededTotal).toBe(5);
  });

  it("passes with two producers each at 6", () => {
    const items = [
      line("w1", 6, { producerId: "p1", producerName: "A" }),
      line("w2", 6, { producerId: "p2", producerName: "B" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(true);
    expect(result.quantity).toBe(12);
    expect(result.neededTotal).toBe(0);
  });

  it("groups wholesaler wines by source_name across producers", () => {
    const items = [
      line("w1", 2, {
        producerId: "p1",
        producerName: "A",
        sourceType: "wholesaler",
        sourceName: "Le Clos Saint Gabriel",
      }),
      line("w2", 4, {
        producerId: "p2",
        producerName: "B",
        sourceType: "wholesaler",
        sourceName: "Le Clos Saint Gabriel",
      }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(true);
    expect(result.producerValidations).toHaveLength(1);
    expect(result.producerValidations[0]!.sourceKind).toBe("wholesaler");
  });

  it("exposes per-source needed for UI / tracking", () => {
    const items = [
      line("w1", 1, { producerId: "p1", producerName: "Alpha" }),
    ];
    const result = validateCartMinimum(items, { channel: "b2c" });
    expect(result.isValid).toBe(false);
    expect(result.neededTotal).toBe(5);
    const meta = cartMinimumTrackingMeta({
      channel: "b2c",
      quantity: result.quantity,
      required: result.requiredQuantity,
      needed: result.neededTotal,
      isValid: result.isValid,
    });
    expect(meta.needed_total).toBe(5);
  });

  it("computeB2CPackingMinimum matches validateCartMinimum", () => {
    const lines = [
      {
        id: "w1",
        quantity: 4,
        producerId: "p1",
        producerName: "A",
        sourceType: "producer",
      },
    ];
    const { progress, sources } = computeB2CPackingMinimum(lines);
    expect(progress.needed).toBe(2);
    expect(sources[0]!.displayName).toBe("A");
  });

  it("empty cart is valid (nothing to pack)", () => {
    const result = validateCartMinimum([], { channel: "b2c" });
    expect(result.isValid).toBe(true);
    expect(result.neededTotal).toBe(0);
  });
});

describe("B2B pack minimum unchanged", () => {
  it("allows single bottles", () => {
    const { progress } = computeB2BPackMinimum([
      { id: "w1", quantity: 1, producerId: "p1" },
    ]);
    expect(progress.isValid).toBe(true);
  });
});
