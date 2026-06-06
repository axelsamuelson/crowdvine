/** URL slug for /shop/[collection] — matches collections-data + checkout-validation. */
export function getProducerHandle(producerName: string): string {
  return producerName.trim().toLowerCase().replace(/\s+/g, "-");
}
