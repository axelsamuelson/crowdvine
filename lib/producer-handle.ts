/** URL slug for /vin/[collection] — ASCII-safe, shared across shop + producer pages. */
export function getProducerHandle(producerName: string): string {
  return generateProducerSlug(producerName);
}

export function generateProducerSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Resolve a /vin or /wine collection segment to a canonical shop handle. */
export function normalizeProducerShopHandle(raw: string): string {
  try {
    return generateProducerSlug(decodeURIComponent(raw.trim()));
  } catch {
    return generateProducerSlug(raw.trim());
  }
}
