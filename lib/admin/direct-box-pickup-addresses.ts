/**
 * Hardcoded wholesaler pickup address fallbacks for admin pick lists.
 * Not stored in DB — config only (Axel 2026-11-11).
 */

export const WHOLESALER_PICKUP_ADDRESS_FALLBACKS: Record<string, string> = {
  // source_name normalized lower-case key (matches packing-source key)
  "le clos saint gabriel": "Marché de Gros, Béziers",
};

export const ADDRESS_MISSING_LABEL = "Adress saknas";

export function wholesalerPickupAddressFallback(
  sourceName: string | null | undefined,
): string | null {
  const key = String(sourceName ?? "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  return WHOLESALER_PICKUP_ADDRESS_FALLBACKS[key] ?? null;
}

export function formatProducerPickupAddress(input: {
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
