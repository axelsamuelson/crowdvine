/**
 * Canonical wine regions for `wines.region` (SSOT for shop filter + region pages).
 * Slugs are French ASCII and identical in SV/EN URLs. DB stores `value` (French name).
 */

export const WINE_REGIONS = [
  {
    slug: "languedoc",
    value: "Languedoc",
    labelSv: "Languedoc",
    labelEn: "Languedoc",
  },
  {
    slug: "beaujolais",
    value: "Beaujolais",
    labelSv: "Beaujolais",
    labelEn: "Beaujolais",
  },
  {
    slug: "loire",
    value: "Loire",
    labelSv: "Loire",
    labelEn: "Loire",
  },
  {
    slug: "bourgogne",
    value: "Bourgogne",
    labelSv: "Bourgogne",
    labelEn: "Burgundy",
  },
  {
    slug: "jura",
    value: "Jura",
    labelSv: "Jura",
    labelEn: "Jura",
  },
  {
    slug: "champagne",
    value: "Champagne",
    labelSv: "Champagne",
    labelEn: "Champagne",
  },
  {
    slug: "rhone",
    value: "Rhône",
    labelSv: "Rhône",
    labelEn: "Rhône Valley",
  },
  {
    slug: "roussillon",
    value: "Roussillon",
    labelSv: "Roussillon",
    labelEn: "Roussillon",
  },
  {
    slug: "alsace",
    value: "Alsace",
    labelSv: "Alsace",
    labelEn: "Alsace",
  },
  {
    slug: "sud-ouest",
    value: "Sud-Ouest",
    labelSv: "Sydvästra Frankrike",
    labelEn: "South West France",
  },
] as const;

export type WineRegionSlug = (typeof WINE_REGIONS)[number]["slug"];
export type WineRegionValue = (typeof WINE_REGIONS)[number]["value"];
export type WineRegion = (typeof WINE_REGIONS)[number];

export const WINE_REGION_VALUES = WINE_REGIONS.map((r) => r.value) as [
  WineRegionValue,
  ...WineRegionValue[],
];

export const WINE_REGION_SLUGS = WINE_REGIONS.map((r) => r.slug) as [
  WineRegionSlug,
  ...WineRegionSlug[],
];

const VALUE_SET = new Set<string>(WINE_REGION_VALUES);
const SLUG_BY_VALUE = new Map<string, WineRegionSlug>(
  WINE_REGIONS.map((r) => [r.value, r.slug]),
);
const REGION_BY_SLUG = new Map<string, WineRegion>(
  WINE_REGIONS.map((r) => [r.slug, r]),
);
const REGION_BY_VALUE = new Map<string, WineRegion>(
  WINE_REGIONS.map((r) => [r.value, r]),
);

/** Synonyms → canonical `wines.region` value (producer / legacy wine strings). */
const REGION_SYNONYMS: Record<string, WineRegionValue> = {
  Languedoc: "Languedoc",
  Beaujolais: "Beaujolais",
  Loire: "Loire",
  Bourgogne: "Bourgogne",
  Jura: "Jura",
  Champagne: "Champagne",
  Rhône: "Rhône",
  Roussillon: "Roussillon",
  Alsace: "Alsace",
  "Sud-Ouest": "Sud-Ouest",
  "Vallée du Rhône": "Rhône",
  Rhone: "Rhône",
  "Rhone Valley": "Rhône",
  Burgundy: "Bourgogne",
  "South West France": "Sud-Ouest",
  "Sud Ouest": "Sud-Ouest",
  Aveyron: "Sud-Ouest",
};

export function isWineRegionValue(value: unknown): value is WineRegionValue {
  return typeof value === "string" && VALUE_SET.has(value);
}

export function isWineRegionSlug(value: unknown): value is WineRegionSlug {
  return typeof value === "string" && REGION_BY_SLUG.has(value);
}

export function wineRegionBySlug(slug: string): WineRegion | undefined {
  return REGION_BY_SLUG.get(slug);
}

export function wineRegionByValue(value: string): WineRegion | undefined {
  return REGION_BY_VALUE.get(value);
}

export function wineRegionSlugFromValue(
  value: string | null | undefined,
): WineRegionSlug | null {
  if (!value) return null;
  return SLUG_BY_VALUE.get(value) ?? null;
}

/**
 * Map a free-text producer/wine region string onto the allowlist, or null.
 * Exact allowlist values and known synonyms only — no invented mappings.
 */
export function mapToWineRegionValue(
  raw: string | null | undefined,
): WineRegionValue | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isWineRegionValue(trimmed)) return trimmed;
  return REGION_SYNONYMS[trimmed] ?? null;
}

/**
 * Resolve the SSOT region for a wine during backfill / create defaults:
 * keep an already-allowlisted wine region; otherwise map from producer, then wine.
 */
export function resolveWineRegionValue(input: {
  wineRegion?: string | null;
  producerRegion?: string | null;
}): WineRegionValue | null {
  if (isWineRegionValue(input.wineRegion?.trim() ?? "")) {
    return input.wineRegion!.trim() as WineRegionValue;
  }
  return (
    mapToWineRegionValue(input.producerRegion) ??
    mapToWineRegionValue(input.wineRegion)
  );
}

export function wineRegionLabel(
  valueOrSlug: string,
  locale: "sv" | "en",
): string | null {
  const region =
    wineRegionByValue(valueOrSlug) ?? wineRegionBySlug(valueOrSlug);
  if (!region) return null;
  return locale === "en" ? region.labelEn : region.labelSv;
}
