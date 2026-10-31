import { describe, expect, it } from "vitest";
import { shouldAutoOpenCartOnQuantityChange } from "@/lib/cart/should-auto-open-cart";

describe("shouldAutoOpenCartOnQuantityChange", () => {
  it("does not open on first observation even when cart already has items", () => {
    expect(shouldAutoOpenCartOnQuantityChange(undefined, 6)).toEqual({
      shouldOpen: false,
      nextKnownQuantity: 6,
    });
  });

  it("does not open on first observation of an empty cart", () => {
    expect(shouldAutoOpenCartOnQuantityChange(undefined, 0)).toEqual({
      shouldOpen: false,
      nextKnownQuantity: 0,
    });
  });

  it("opens when total bottle count increases", () => {
    expect(shouldAutoOpenCartOnQuantityChange(6, 12)).toEqual({
      shouldOpen: true,
      nextKnownQuantity: 12,
    });
  });

  it("does not open when quantity is unchanged (e.g. server refetch / price sync)", () => {
    expect(shouldAutoOpenCartOnQuantityChange(6, 6)).toEqual({
      shouldOpen: false,
      nextKnownQuantity: 6,
    });
  });

  it("does not open when quantity decreases (remove / clear)", () => {
    expect(shouldAutoOpenCartOnQuantityChange(12, 6)).toEqual({
      shouldOpen: false,
      nextKnownQuantity: 6,
    });
    expect(shouldAutoOpenCartOnQuantityChange(6, 0)).toEqual({
      shouldOpen: false,
      nextKnownQuantity: 0,
    });
  });
});
