import { describe, expect, it } from "vitest";
import {
  B2B_MIN_LINE_BOTTLES,
  BOTTLE_PACK_SIZE,
  ceilBottlePackQuantity,
  clampBottlePackQuantity,
  isBottlePackQuantity,
  mergeB2BPackQuantity,
  normalizeExistingB2BLineQuantity,
} from "@/lib/cart/bottle-pack";

describe("bottle-pack (Dirty Wine single-bottle rules)", () => {
  it("accepts any integer quantity from 1…max (no multiples-of-6 rule)", () => {
    expect(isBottlePackQuantity(1)).toBe(true);
    expect(isBottlePackQuantity(2)).toBe(true);
    expect(isBottlePackQuantity(6)).toBe(true);
    expect(isBottlePackQuantity(7)).toBe(true);
    expect(isBottlePackQuantity(0)).toBe(false);
    expect(isBottlePackQuantity(-1)).toBe(false);
    expect(isBottlePackQuantity(1.5)).toBe(false);
  });

  it("merges by simple sum without snapping to packs", () => {
    expect(mergeB2BPackQuantity(1, 1)).toBe(2);
    expect(mergeB2BPackQuantity(1, BOTTLE_PACK_SIZE)).toBe(7);
    expect(mergeB2BPackQuantity(2, BOTTLE_PACK_SIZE)).toBe(8);
    expect(mergeB2BPackQuantity(6, BOTTLE_PACK_SIZE)).toBe(12);
    expect(mergeB2BPackQuantity(7, 1)).toBe(8);
  });

  it("normalizes empty lines to 1 and keeps odd quantities", () => {
    expect(normalizeExistingB2BLineQuantity(0)).toBe(B2B_MIN_LINE_BOTTLES);
    expect(normalizeExistingB2BLineQuantity(1)).toBe(1);
    expect(normalizeExistingB2BLineQuantity(5)).toBe(5);
    expect(normalizeExistingB2BLineQuantity(7)).toBe(7);
    expect(normalizeExistingB2BLineQuantity(12)).toBe(12);
  });

  it("clamps within 1…max without pack rounding", () => {
    expect(clampBottlePackQuantity(8)).toBe(8);
    expect(ceilBottlePackQuantity(1)).toBe(1);
    expect(ceilBottlePackQuantity(7)).toBe(7);
    expect(clampBottlePackQuantity(0)).toBe(1);
    expect(clampBottlePackQuantity(200)).toBe(96);
  });
});
