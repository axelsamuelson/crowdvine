/**
 * Customer-facing destination for shared-pallet confirmation
 * ("Delad pall till Stockholm" / "Shared pallet to Stockholm").
 * Prefer a city from the delivery address; fall back to a cleaned zone name.
 */
export function confirmationSharedPalletCity(args: {
  deliveryAddress?: string | null;
  deliveryZone?: string | null;
}): string | null {
  const address = String(args.deliveryAddress ?? "").trim();
  if (address) {
    // "Street, 11122 Stockholm, SE" or "Street, Stockholm"
    const parts = address
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const part = parts[i]!;
      if (/^[A-Z]{2}$/i.test(part)) continue; // country code
      const withoutPostal = part.replace(/^\d{3}\s*\d{2}\s+/, "").trim();
      if (withoutPostal && !/^\d+$/.test(withoutPostal)) {
        return withoutPostal;
      }
    }
  }

  const zone = String(args.deliveryZone ?? "").trim();
  if (!zone) return null;
  // "Synthetic Stockholm Delivery" / "Stockholm leverans" → Stockholm
  const cleaned = zone
    .replace(/\b(synthetic|delivery|leverans|zone|zon)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}
