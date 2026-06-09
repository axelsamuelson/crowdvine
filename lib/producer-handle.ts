/** URL slug for /vin/[collection] — matches collections-data + checkout-validation. */
export function getProducerHandle(producerName: string): string {
  return producerName.trim().toLowerCase().replace(/\s+/g, "-");
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
