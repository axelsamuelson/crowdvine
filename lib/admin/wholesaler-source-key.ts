/**
 * Wholesaler packing-source key helpers for admin Källor.
 * Must stay aligned with resolvePackingSourceId in lib/cart/packing-source.ts.
 */

import { resolvePackingSourceId } from "@/lib/cart/packing-source";

/** Build packing key from a raw wines.source_name. */
export function wholesalerSourceKeyFromName(
  sourceName: string | null | undefined,
): string {
  return resolvePackingSourceId({
    sourceType: "wholesaler",
    sourceName,
  });
}

/** True when key is a wholesaler packing id (`wholesaler:…`). */
export function isWholesalerSourceKey(sourceKey: string | null | undefined): boolean {
  return String(sourceKey ?? "")
    .trim()
    .toLowerCase()
    .startsWith("wholesaler:");
}

/**
 * Extract the normalized name fragment from a wholesaler packing key.
 * Returns null when the key is not a wholesaler key.
 */
export function wholesalerNameFromSourceKey(
  sourceKey: string | null | undefined,
): string | null {
  const raw = String(sourceKey ?? "").trim();
  const lower = raw.toLowerCase();
  if (!lower.startsWith("wholesaler:")) return null;
  const rest = raw.slice("wholesaler:".length).trim();
  return rest || null;
}

/** Re-normalize an arbitrary key/name to the canonical packing key. */
export function normalizeWholesalerSourceKey(
  sourceKeyOrName: string | null | undefined,
): string {
  const raw = String(sourceKeyOrName ?? "").trim();
  if (!raw) return wholesalerSourceKeyFromName("");
  if (isWholesalerSourceKey(raw)) {
    const name = wholesalerNameFromSourceKey(raw);
    return wholesalerSourceKeyFromName(name);
  }
  return wholesalerSourceKeyFromName(raw);
}
