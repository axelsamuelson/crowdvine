import { pickPopularProducerCollections } from "@/lib/analytics/producer-ctr";
import { ConditionalHeader } from "./conditional-header";
import type { Collection } from "@/lib/shopify/types";

/**
 * Server wrapper that only loads cacheable collection popularity.
 * Dirtywine / pathname hiding is resolved client-side so this stays ISR-safe.
 */
export async function ConditionalHeaderServer({
  collections,
}: {
  collections: Collection[];
}) {
  const popularCollections = await pickPopularProducerCollections(collections);

  return (
    <ConditionalHeader
      collections={collections}
      popularCollections={popularCollections}
    />
  );
}
