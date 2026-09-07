import { describe, expect, it } from "vitest";
import {
  BOTTLE_PACK_SIZE,
  ceilBottlePackQuantity,
  clampBottlePackQuantity,
  isBottlePackQuantity,
  mergeB2BPackQuantity,
  normalizeExistingB2BLineQuantity,
} from "@/lib/cart/bottle-pack";

describe("bottle-pack", () => {
  it("recognizes pack quantities", () => {
    expect(isBottlePackQuantity(6)).toBe(true);
    expect(isBottlePackQuantity(1)).toBe(false);
    expect(isBottlePackQuantity(7)).toBe(false);
  });

  it("merges legacy odd qty + pack without leaving 7", () => {
    expect(mergeB2BPackQuantity(1, BOTTLE_PACK_SIZE)).toBe(6);
    expect(mergeB2BPackQuantity(2, BOTTLE_PACK_SIZE)).toBe(6);
    expect(mergeB2BPackQuantity(6, BOTTLE_PACK_SIZE)).toBe(12);
    expect(mergeB2BPackQuantity(7, BOTTLE_PACK_SIZE)).toBe(12);
  });

  it("normalizes existing odd lines", () => {
    expect(normalizeExistingB2BLineQuantity(1)).toBe(6);
    expect(normalizeExistingB2BLineQuantity(5)).toBe(6);
    expect(normalizeExistingB2BLineQuantity(7)).toBe(6);
    expect(normalizeExistingB2BLineQuantity(12)).toBe(12);
  });

  it("clamps and ceils within bounds", () => {
    expect(clampBottlePackQuantity(8)).toBe(6);
    expect(ceilBottlePackQuantity(1)).toBe(6);
    expect(ceilBottlePackQuantity(7)).toBe(12);
  });
});
