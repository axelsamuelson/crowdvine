import { Suspense } from "react";

import { PdpRecommendationsSection } from "@/components/product/pdp-recommendations-section";
import { PdpSiblingWinesSection } from "@/components/product/pdp-sibling-wines-section";
import { fetchPdpRecommendationsForWine } from "@/lib/crowdvine/pdp-recommendations-data";
import type { AppLocale } from "@/lib/i18n/locale";
import type { PdpRecommendationsResult } from "@/lib/product/recommendations";
import { pickPdpSiblingWines } from "@/lib/product/pdp-sibling-wines";
import type { Product } from "@/lib/shopify/types";

async function PdpRecommendationsBody({
  product,
  locale,
  host,
  recommendationsPromise,
}: {
  product: Product;
  locale: AppLocale;
  host: string | null;
  recommendationsPromise?: Promise<PdpRecommendationsResult | null>;
}) {
  const recommendations =
    (await (recommendationsPromise ??
      fetchPdpRecommendationsForWine(product, { host }).catch(() => ({
        sameProducer: [],
        similar: [],
        items: [],
      })))) ?? {
      sameProducer: [],
      similar: [],
      items: [],
    };

  const siblingWines =
    product.productType === "wine" && recommendations.sameProducer.length
      ? pickPdpSiblingWines(
          product,
          recommendations.sameProducer.map((r) => r.product),
          3,
        )
      : [];

  return (
    <>
      {siblingWines.length > 0 && product.producerName ? (
        <PdpSiblingWinesSection
          producerName={product.producerName}
          locale={locale}
          wines={siblingWines}
        />
      ) : null}

      {recommendations.sameProducer.length > 0 ||
      recommendations.similar.length > 0 ? (
        <PdpRecommendationsSection recommendations={recommendations} />
      ) : null}
    </>
  );
}

/** Streams PDP recommendations (+ sibling strip) without blocking above-the-fold HTML. */
export function PdpRecommendationsAsync({
  product,
  locale,
  host = null,
  recommendationsPromise,
}: {
  product: Product;
  locale: AppLocale;
  host?: string | null;
  /** Prefetched in parallel with competitor/pallet work. */
  recommendationsPromise?: Promise<PdpRecommendationsResult | null>;
}) {
  if (product.productType !== "wine") return null;

  return (
    <Suspense fallback={null}>
      <PdpRecommendationsBody
        product={product}
        locale={locale}
        host={host}
        recommendationsPromise={recommendationsPromise}
      />
    </Suspense>
  );
}
