import { isB2BHost } from "@/lib/b2b-site";
import {
  fetchCollectionProductsData,
  fetchProductsData,
} from "@/lib/crowdvine/products-data";
import {
  buildPdpRecommendations,
  extractSimilaritySignals,
  type PdpRecommendationsResult,
} from "@/lib/product/recommendations";
import type { Product } from "@/lib/shopify/types";

/**
 * Fetch PDP recommendations (v1 heuristics).
 * Same producer + similar profile mix — foundation for a future recommendation engine.
 */
export async function fetchPdpRecommendationsForWine(
  product: Product,
  params?: {
    host?: string | null;
    maxTotal?: number;
  },
): Promise<PdpRecommendationsResult> {
  const empty: PdpRecommendationsResult = {
    sameProducer: [],
    similar: [],
    items: [],
  };

  if (product.productType !== "wine" || !product.id) return empty;

  const isB2BSite = isB2BHost(params?.host ?? null, null);
  const anchor = extractSimilaritySignals(product);

  /** Keep list prices in SEK — client converts via shopping context (matches PDP hero). */
  const priceParams = {
    displayCurrencyCode: "SEK" as const,
    sekToDisplayRate: 1,
  };

  const [sameProducerRows, catalogRows] = await Promise.all([
    product.producerId
      ? fetchCollectionProductsData(product.producerId, {
          limit: 12,
          isB2BSite,
          ...priceParams,
        })
      : Promise.resolve([]),
    fetchProductsData({
      limit: 100,
      sortKey: "CREATED_AT",
      reverse: true,
      isB2BSite,
      ...priceParams,
    }),
  ]);

  const result = buildPdpRecommendations({
    anchor,
    sameProducerCandidates: sameProducerRows as Product[],
    similarCandidates: catalogRows as Product[],
    maxSameProducer: 12,
    maxSimilar: 12,
    maxTotal: params?.maxTotal ?? 12,
  });

  if (result.sameProducer.length === 0 && result.similar.length === 0) {
    return empty;
  }
  return result;
}
