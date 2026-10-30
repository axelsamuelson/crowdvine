/**
 * B2C ships as subsidized direct boxes from the producer until volume
 * supports a shared pallet. Customer-facing copy must not expose pallet fill.
 *
 * TODO: Replace with a confirmed ops SLA before showing any delivery-time
 * string to customers. Do not invent days/weeks/prices here.
 */
export const B2C_DIRECT_BOX_DELIVERY_TIME_TODO: string | null = null;

/** Message key for the customer-facing direct-box promise (sv/en). */
export const DIRECT_BOX_DELIVERY_MESSAGE_KEY =
  "commerce.directBoxDeliveryPromise" as const;
