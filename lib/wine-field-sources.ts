/**
 * Allowlisted field keys for public.wine_field_sources.
 * Adapted to actual wines.* columns (grape → grape_varieties).
 */

export const WINE_FIELD_SOURCE_FIELDS = [
  "abv",
  "region",
  "grape_varieties",
  "color",
  "description",
] as const;

export type WineFieldSourceField = (typeof WINE_FIELD_SOURCE_FIELDS)[number];

const FIELD_SET = new Set<string>(WINE_FIELD_SOURCE_FIELDS);

export function isWineFieldSourceField(
  value: unknown,
): value is WineFieldSourceField {
  return typeof value === "string" && FIELD_SET.has(value);
}
