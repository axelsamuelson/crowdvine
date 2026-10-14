import { describe, expect, it } from "vitest";
import {
  aggregateProducerCtr,
  pickTopCollectionsByCtr,
  POPULAR_PRODUCER_LIMIT,
} from "../producer-ctr";

const collections = [
  { id: "a", handle: "alpha", title: "Alpha" },
  { id: "b", handle: "beta", title: "Beta" },
  { id: "c", handle: "gamma", title: "Gamma" },
  { id: "d", handle: "delta", title: "Delta" },
  { id: "e", handle: "epsilon", title: "Epsilon" },
  { id: "f", handle: "zeta", title: "Zeta" },
  { id: "boxes", handle: "wine-boxes", title: "Wine Boxes" },
];

describe("producer CTR", () => {
  it("counts list appearances as impressions and detail views as clicks", () => {
    const stats = aggregateProducerCtr([
      {
        event_type: "product_list_viewed",
        event_metadata: { producerIds: ["a", "b", "a"] },
      },
      {
        event_type: "product_viewed",
        event_metadata: { producerId: "a" },
      },
      {
        event_type: "product_viewed",
        event_metadata: { producerId: "b" },
      },
      {
        event_type: "product_viewed",
        event_metadata: { producerId: "b" },
      },
    ]);

    expect(stats.get("a")).toMatchObject({
      impressions: 2,
      clicks: 1,
      ctr: 0.5,
    });
    expect(stats.get("b")).toMatchObject({
      impressions: 1,
      clicks: 2,
      ctr: 2,
    });
  });

  it("keeps the five producers with the highest CTR and drops wine boxes", () => {
    const stats = aggregateProducerCtr([
      {
        event_type: "product_list_viewed",
        event_metadata: {
          producerIds: ["a", "b", "b", "c", "d", "e", "f", "boxes"],
        },
      },
      { event_type: "product_viewed", event_metadata: { producerId: "f" } },
      { event_type: "product_viewed", event_metadata: { producerId: "f" } },
      { event_type: "product_viewed", event_metadata: { producerId: "f" } },
      { event_type: "product_viewed", event_metadata: { producerId: "f" } },
      { event_type: "product_viewed", event_metadata: { producerId: "e" } },
      { event_type: "product_viewed", event_metadata: { producerId: "e" } },
      { event_type: "product_viewed", event_metadata: { producerId: "e" } },
      { event_type: "product_viewed", event_metadata: { producerId: "d" } },
      { event_type: "product_viewed", event_metadata: { producerId: "d" } },
      { event_type: "product_viewed", event_metadata: { producerId: "c" } },
      { event_type: "product_viewed", event_metadata: { producerId: "b" } },
      { event_type: "product_viewed", event_metadata: { producerId: "boxes" } },
      { event_type: "product_viewed", event_metadata: { producerId: "boxes" } },
      { event_type: "product_viewed", event_metadata: { producerId: "boxes" } },
      { event_type: "product_viewed", event_metadata: { producerId: "boxes" } },
    ]);

    const top = pickTopCollectionsByCtr(collections, stats);

    expect(top).toHaveLength(POPULAR_PRODUCER_LIMIT);
    expect(top.map((item) => item.id)).toEqual(["f", "e", "d", "c", "b"]);
    expect(top.some((item) => item.handle === "wine-boxes")).toBe(false);
  });

  it("breaks CTR ties with clicks, then falls back to title", () => {
    const stats = aggregateProducerCtr([
      {
        event_type: "product_list_viewed",
        event_metadata: { producerIds: ["a", "b", "c"] },
      },
      { event_type: "product_viewed", event_metadata: { producerId: "a" } },
      { event_type: "product_viewed", event_metadata: { producerId: "b" } },
      { event_type: "product_viewed", event_metadata: { producerId: "b" } },
    ]);

    const top = pickTopCollectionsByCtr(collections, stats, 3);
    expect(top.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });
});
