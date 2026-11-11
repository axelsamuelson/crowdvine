/**
 * B2C ships as subsidized direct boxes from the producer until volume
 * supports a shared pallet. Customer-facing copy must not expose pallet fill
 * or carrier brand (never show "UPS").
 *
 * Delivery window decided Axel 01:24: 5–10 working days.
 */
export const B2C_DIRECT_BOX_DELIVERY_TIME_TODO: string | null =
  "5–10 arbetsdagar";
export const B2C_DIRECT_BOX_DELIVERY_TIME_EN = "5–10 working days";

/** Message key for the customer-facing direct-box promise (sv/en). */
export const DIRECT_BOX_DELIVERY_MESSAGE_KEY =
  "commerce.directBoxDeliveryPromise" as const;

/** The producer-box line is true only for wines.source_type = producer. */
export function isProducerSourcedWine(
  sourceType: string | null | undefined,
): boolean {
  return sourceType?.trim().toLowerCase() === "producer";
}
