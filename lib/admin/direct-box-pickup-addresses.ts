/**
 * Hardcoded wholesaler sender-address fallbacks for admin pick lists.
 * Not stored in DB — config only (Axel 2026-11-11).
 */

export const WHOLESALER_SENDER_ADDRESS_FALLBACKS: Record<string, string> = {
  // source_name normalized lower-case key (matches packing-source key)
  "le clos saint gabriel": "Marché de Gros, Béziers",
};

/** @deprecated Use {@link WHOLESALER_SENDER_ADDRESS_FALLBACKS} */
export const WHOLESALER_PICKUP_ADDRESS_FALLBACKS =
  WHOLESALER_SENDER_ADDRESS_FALLBACKS;

export const ADDRESS_MISSING_LABEL = "Adress saknas";
export const EMAIL_MISSING_LABEL = "E-post saknas";

export function wholesalerSenderAddressFallback(
  sourceName: string | null | undefined,
): string | null {
  const key = String(sourceName ?? "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  return WHOLESALER_SENDER_ADDRESS_FALLBACKS[key] ?? null;
}

/** @deprecated Use {@link wholesalerSenderAddressFallback} */
export const wholesalerPickupAddressFallback = wholesalerSenderAddressFallback;

export function formatProducerSenderAddress(input: {
  address_street?: string | null;
  address_postcode?: string | null;
  address_city?: string | null;
}): string {
  const street = String(input.address_street ?? "").trim();
  const postcode = String(input.address_postcode ?? "").trim();
  const city = String(input.address_city ?? "").trim();
  const line = [street, [postcode, city].filter(Boolean).join(" ")]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
  return line || ADDRESS_MISSING_LABEL;
}

/** @deprecated Use {@link formatProducerSenderAddress} */
export const formatProducerPickupAddress = formatProducerSenderAddress;
