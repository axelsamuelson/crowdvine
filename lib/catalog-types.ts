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
  "rose",
  "sparkling",
  "orange",
] as const;

/** Admin/PDP color labels (also accepted via MCP `color` field). */
export const CATALOG_WINE_COLOR_LABELS = [
  "Red",
  "White",
  "Rose",
  "Orange",
  "Red & Orange",
  "Red & White",
  "Orange & White",
] as const;

const WINE_COLOR_ALIASES: Record<string, string> = {
  red: "Red",
  white: "White",
  rosé: "Rose",
  rose: "Rose",
  sparkling: "Sparkling",
  orange: "Orange",
};

/** Normalize MCP/catalog color input to DB/PDP color label. */
export function normalizeCatalogWineColor(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return WINE_COLOR_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function isCatalogWineColor(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = normalizeCatalogWineColor(value);
  return (
    isCatalogWineType(value) ||
    (CATALOG_WINE_COLOR_LABELS as readonly string[]).includes(normalized)
  );
}

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
