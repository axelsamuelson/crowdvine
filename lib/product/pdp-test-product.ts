import { getProduct } from "@/lib/shopify";
import type { Product } from "@/lib/shopify/types";
import {
  AU_MAS_HANDLE,
  getPdpTestFixture,
  PDP_TEST_ENRICHMENT_FULL,
  type PdpTestFixtureId,
} from "@/lib/product/pdp-test-fixture";

export { AU_MAS_HANDLE };

function withLiveImages(
  product: Product & { productType?: string },
  live: Product,
): Product & { productType: string } {
  return {
    ...product,
    productType: product.productType ?? "wine",
    id: live.id,
    handle: live.handle,
    title: live.title,
    producerId: live.producerId,
    producerName: live.producerName ?? product.producerName,
    featuredImage: live.featuredImage,
    images: live.images,
  };
}

/** Live Au Mas product merged with fixture overrides for dev PDP preview. */
export async function getPdpTestProduct(
  fixtureId: PdpTestFixtureId,
): Promise<Product & { productType: string }> {
  const fixture = getPdpTestFixture(fixtureId);
  const live = await getProduct(AU_MAS_HANDLE);

  if (!live) return fixture;

  if (fixtureId === "full") {
    return {
      ...live,
      productType: "wine",
      wineEnrichment: {
        ...live.wineEnrichment,
        ...PDP_TEST_ENRICHMENT_FULL,
        grapeVarieties:
          live.wineEnrichment?.grapeVarieties ??
          PDP_TEST_ENRICHMENT_FULL.grapeVarieties,
      },
    };
  }

  return withLiveImages(fixture, live);
}
