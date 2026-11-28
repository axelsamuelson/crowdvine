import { describe, expect, it } from "vitest";
import { pickTopCollectionsByCtr } from "@/lib/analytics/producer-ctr";
import { sortProductsByPopularity } from "@/lib/analytics/product-view-stats";

describe("shop view stats fail-soft fallbacks", () => {
  it("falls back to title order when producer CTR map is empty", () => {
    const collections = [
      { id: "b", handle: "beta", title: "Beta" },
      { id: "a", handle: "alpha", title: "Alpha" },
      { id: "c", handle: "gamma", title: "Gamma" },
    ];
    const top = pickTopCollectionsByCtr(collections, new Map(), 3);
    expect(top.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps input order when product view stats are empty", () => {
    const products = [{ id: "w1" }, { id: "w2" }, { id: "w3" }];
    expect(sortProductsByPopularity(products, new Map()).map((p) => p.id)).toEqual([
      "w1",
      "w2",
      "w3",
    ]);
  });
});
