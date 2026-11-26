import { pickPopularProducerCollections } from "@/lib/analytics/producer-ctr";
import { toHeaderProducerLinks } from "@/lib/shop/shop-producer-link";
import { ConditionalHeader } from "./conditional-header";

/**
 * Server wrapper that only loads cacheable collection popularity.
 * The client receives the producers the menu renders (name + handle), not the
 * full producer records. Dirtywine / pathname hiding stays client-side so
 * this remains ISR-safe.
 */
export async function ConditionalHeaderServer({
  collections,
}: {
  collections: Array<{ id: string; handle: string; title: string }>;
}) {
  const popularCollections = await pickPopularProducerCollections(collections);

  return (
    <ConditionalHeader
      popularCollections={toHeaderProducerLinks(popularCollections)}
    />
  );
}