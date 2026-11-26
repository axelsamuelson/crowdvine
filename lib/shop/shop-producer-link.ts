/** Fields the header menu actually renders (name + producer path). */
export type HeaderProducerLink = {
  handle: string;
  title: string;
};

/**
 * Fields the shop producer filter and breadcrumb render.
 * Descriptions, certifications and timestamps stay on the server.
 */
export type ShopProducerLink = {
  handle: string;
  title: string;
  displayName?: string | null;
};

export function toHeaderProducerLinks<
  T extends { handle: string; title: string },
>(collections: T[]): HeaderProducerLink[] {
  return collections.map((collection) => ({
    handle: collection.handle,
    title: collection.title,
  }));
}

export function toShopProducerLinks<
  T extends { handle: string; title: string; displayName?: string | null },
>(collections: T[]): ShopProducerLink[] {
  return collections.map((collection) => ({
    handle: collection.handle,
    title: collection.title,
    displayName: collection.displayName ?? null,
  }));
}
