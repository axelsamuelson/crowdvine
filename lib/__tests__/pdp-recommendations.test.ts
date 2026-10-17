import { describe, expect, it } from "vitest";
import {
  buildPdpRecommendations,
  type WineSimilaritySignals,
} from "@/lib/product/recommendations";
import type { Product } from "@/lib/shopify/types";

function wine(partial: {
  id: string;
  handle: string;
  producerId?: string;
  color?: string;
  grapes?: string[];
  price?: number;
}): Product {
  return {
    id: partial.id,
    handle: partial.handle,
    title: partial.handle,
    productType: "wine",
    producerId: partial.producerId ?? null,
    availableForSale: true,
    tags: partial.color ? [partial.color] : [],
    wineEnrichment: {
      color: partial.color ?? null,
      grapeVarieties: partial.grapes ?? null,
      appellation: null,
    },
    priceRange: {
      minVariantPrice: {
        amount: String(partial.price ?? 180),
        currencyCode: "SEK",
      },
    },
  } as unknown as Product;
}

describe("buildPdpRecommendations", () => {
  const anchor: WineSimilaritySignals = {
    wineId: "anchor",
    handle: "anchor-wine",
    producerId: "producer-a",
    color: "red",
    grapeVarieties: ["carignan"],
    appellation: "vin de france",
    basePriceSek: 180,
  };

  it("keeps same-producer and similar wines in separate lists for two carousel rows", () => {
    const result = buildPdpRecommendations({
      anchor,
      sameProducerCandidates: [
        wine({ id: "a1", handle: "same-1", producerId: "producer-a", color: "red" }),
        wine({ id: "a2", handle: "same-2", producerId: "producer-a", color: "red" }),
        wine({ id: "a3", handle: "same-3", producerId: "producer-a", color: "white" }),
      ],
      similarCandidates: [
        wine({
          id: "b1",
          handle: "similar-1",
          producerId: "producer-b",
          color: "red",
          grapes: ["carignan"],
          price: 175,
        }),
        wine({
          id: "b2",
          handle: "similar-2",
          producerId: "producer-c",
          color: "red",
          grapes: ["carignan"],
          price: 190,
        }),
        wine({
          id: "b3",
          handle: "similar-3",
          producerId: "producer-d",
          color: "orange",
          grapes: ["macabeu"],
          price: 400,
        }),
      ],
      maxSameProducer: 12,
      maxSimilar: 12,
      maxTotal: 12,
    });

    expect(result.sameProducer.map((r) => r.product.handle)).toEqual([
      "same-1",
      "same-2",
      "same-3",
    ]);
    expect(result.sameProducer.every((r) => r.reason === "same_producer")).toBe(
      true,
    );

    expect(result.similar.length).toBeGreaterThanOrEqual(2);
    expect(result.similar[0]?.product.handle).toBe("similar-1");
    expect(result.similar[1]?.product.handle).toBe("similar-2");
    expect(result.similar.every((r) => r.reason === "similar_profile")).toBe(
      true,
    );
    expect(
      result.similar.every((r) => r.product.producerId !== "producer-a"),
    ).toBe(true);
    expect(
      result.sameProducer.some((r) =>
        result.similar.some((s) => s.product.id === r.product.id),
      ),
    ).toBe(false);
  });
});

