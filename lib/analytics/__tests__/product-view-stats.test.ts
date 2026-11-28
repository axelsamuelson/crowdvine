import { describe, expect, it } from "vitest";
import {
  aggregateWineViewStats,
  computePlpToPdpConversionRate,
  sortProductsByPopularity,
} from "../product-view-stats";

describe("product view stats", () => {
  it("counts list appearances as PLP views and detail views as PDP views", () => {
    const stats = aggregateWineViewStats([
      {
        event_type: "product_list_viewed",
        event_metadata: { productIds: ["w1", "w2", "w1"] },
      },
      {
        event_type: "product_viewed",
        event_metadata: { productId: "w1" },
      },
      {
        event_type: "product_viewed",
        event_metadata: { productId: "w2" },
      },
      {
        event_type: "product_viewed",
        event_metadata: { productId: "w2" },
      },
    ]);

    expect(stats.get("w1")).toMatchObject({
      plpViews: 2,
      pdpViews: 1,
      conversionRate: 0.5,
    });
    expect(stats.get("w2")).toMatchObject({
      plpViews: 1,
      pdpViews: 2,
      conversionRate: 2,
    });
  });

  it("ignores non-string ids and empty metadata", () => {
    const stats = aggregateWineViewStats([
      {
        event_type: "product_list_viewed",
        event_metadata: { productIds: ["w1", 12, null, "  "] },
      },
      {
        event_type: "product_viewed",
        event_metadata: { productId: 99 },
      },
      {
        event_type: "product_viewed",
        event_metadata: null,
      },
    ]);

    expect(stats.get("w1")).toMatchObject({ plpViews: 1, pdpViews: 0 });
    expect(stats.size).toBe(1);
  });

  it("sorts by conversion rate, then PDP, then PLP", () => {
    const products = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const stats = new Map([
      ["a", { plpViews: 10, pdpViews: 1, conversionRate: 0.1 }],
      ["b", { plpViews: 2, pdpViews: 2, conversionRate: 1 }],
      ["c", { plpViews: 5, pdpViews: 5, conversionRate: 1 }],
    ]);

    expect(sortProductsByPopularity(products, stats).map((p) => p.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("returns 0 conversion when there are no PLP views", () => {
    expect(computePlpToPdpConversionRate(0, 5)).toBe(0);
  });
});
