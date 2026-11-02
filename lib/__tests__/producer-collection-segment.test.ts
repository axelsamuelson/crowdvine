import { describe, expect, it } from "vitest";

import { countActiveShopFilters } from "@/lib/shop/filter-count-server";
import {
  isProducerCollectionSegment,
  isWineCategoryPathSegment,
} from "@/lib/shop/producer-collection-segment";

describe("producer collection segment vs wine category paths", () => {
  it("treats colour/farming category slugs as wine categories, not producers", () => {
    expect(isWineCategoryPathSegment("rott-naturvin")).toBe(true);
    expect(isWineCategoryPathSegment("red-natural-wine")).toBe(true);
    expect(isWineCategoryPathSegment("vitt-naturvin")).toBe(true);
    expect(isWineCategoryPathSegment("organic-wine")).toBe(true);
    expect(isProducerCollectionSegment("rott-naturvin")).toBe(false);
    expect(isProducerCollectionSegment("red-natural-wine")).toBe(false);
  });

  it("treats producer-box slugs as non-producer filters", () => {
    expect(isProducerCollectionSegment("naturvin-lada")).toBe(false);
    expect(isProducerCollectionSegment("natural-wine-box")).toBe(false);
  });

  it("treats unknown non-category segments as producer collections", () => {
    expect(isProducerCollectionSegment("some-producer-handle")).toBe(true);
    expect(isProducerCollectionSegment(undefined)).toBe(false);
  });

  it("counts path-based colour + region, not as a producer", () => {
    // /vin/rott-naturvin?region=loire → colour (path) + region
    expect(
      countActiveShopFilters({ region: "loire" }, "rott-naturvin"),
    ).toBe(2);
    expect(
      countActiveShopFilters({ region: "loire" }, "red-natural-wine"),
    ).toBe(2);
    expect(
      countActiveShopFilters({ region: "loire" }, "some-producer-handle"),
    ).toBe(2);
    expect(countActiveShopFilters({ region: "loire" })).toBe(1);
    // path colour alone
    expect(countActiveShopFilters({}, "rott-naturvin")).toBe(1);
    // ?fcolor= already counted — do not double-count path
    expect(
      countActiveShopFilters({ fcolor: "Red" }, "rott-naturvin"),
    ).toBe(1);
  });
});
