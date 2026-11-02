import {
  getWineCategoryEn,
  getWineCategorySv,
} from "@/lib/wine-categories";

/** Keep in sync with PRODUCER_BOXES_PATH (config module is server-only). */
const PRODUCER_BOX_SLUGS = new Set(["naturvin-lada", "natural-wine-box"]);

/**
 * `/vin|/wine/[segment]` wine category pages (colour, farming, grape, …).
 * These share the collection route with producer handles but are not
 * producer filters.
 */
export function isWineCategoryPathSegment(segment: string): boolean {
  return Boolean(getWineCategorySv(segment) || getWineCategoryEn(segment));
}

/**
 * True when the shop path segment is a producer collection filter — not a
 * wine-box slug and not a wine category page (e.g. rott-naturvin).
 */
export function isProducerCollectionSegment(
  segment: string | undefined,
): boolean {
  if (!segment) return false;
  if (PRODUCER_BOX_SLUGS.has(segment)) return false;
  if (isWineCategoryPathSegment(segment)) return false;
  return true;
}
