/**
 * Curated Systembolaget categories.
 * Client-safe: no server imports, so /admin/systembolaget can use it
 * without pulling the service-role client into the browser bundle.
 * Re-exported from guide-wines.ts.
 *
 * "new" is the release calendar. It is not a ranked list.
 */
export const GUIDE_WINE_CATEGORIES = [
  "red",
  "white",
  "orange",
  "sparkling",
  "rose",
  "budget",
  "glouglou",
  "petnat",
  "best",
  "new",
] as const;

export type GuideWineCategory = (typeof GUIDE_WINE_CATEGORIES)[number];

/**
 * Product-attribute filters for search_systembolaget_products.
 * These map to colour, style or list type on systembolaget_products.
 * "new" is curation only and is intentionally absent.
 */
export const SYSTEMBOLAGET_PRODUCT_SEARCH_CATEGORIES = [
  "red",
  "white",
  "orange",
  "sparkling",
  "rose",
  "budget",
  "glouglou",
  "petnat",
  "best",
] as const satisfies readonly Exclude<GuideWineCategory, "new">[];
