export const CATALOG_CERTIFICATION_VALUES = [
  "organic_certified",
  "biodynamic_certified",
  "natural",
  "sustainable",
  "conventional",
] as const;

export const CATALOG_WINE_TYPE_VALUES = [
  "red",
  "white",
  "rosé",
  "sparkling",
] as const;

export type CatalogCertification =
  (typeof CATALOG_CERTIFICATION_VALUES)[number];
export type CatalogWineType = (typeof CATALOG_WINE_TYPE_VALUES)[number];

export function isCatalogCertification(
  value: unknown,
): value is CatalogCertification {
  return (
    typeof value === "string" &&
    (CATALOG_CERTIFICATION_VALUES as readonly string[]).includes(value)
  );
}

export function isCatalogWineType(value: unknown): value is CatalogWineType {
  return (
    typeof value === "string" &&
    (CATALOG_WINE_TYPE_VALUES as readonly string[]).includes(value)
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
