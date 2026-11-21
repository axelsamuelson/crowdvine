/**
 * URL slug for public producer profile + shop collection paths.
 *
 * Always pass the legal `producers.name` — never `display_name`.
 * Example: legal "Domaine Jean Foillard" → `domaine-jean-foillard`;
 * display "Jean Foillard" alone would wrongly yield `jean-foillard` (404).
 */
export function getProducerHandle(legalProducerName: string): string {
  return generateProducerSlug(legalProducerName);
}

/** @see getProducerHandle — same rules; keep one ASCII slug algorithm. */
export function generateProducerSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Public profile slug from legal `producers.name` only.
 * Prefer this at call sites that also have a display label nearby.
 */
export function producerProfileSlugFromLegalName(
  legalProducerName: string,
): string {
  return generateProducerSlug(legalProducerName);
}

/** Resolve a /vin or /wine collection segment to a canonical shop handle. */
export function normalizeProducerShopHandle(raw: string): string {
  try {
    return generateProducerSlug(decodeURIComponent(raw.trim()));
  } catch {
    return generateProducerSlug(raw.trim());
  }
}
