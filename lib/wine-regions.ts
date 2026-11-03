/**
 * Canonical wine regions for `wines.region` (SSOT for shop filter + region pages).
 * Slugs are French ASCII and identical in SV/EN URLs. DB stores `value` (French name).
 */

import type { AppLocale } from "@/lib/i18n/locale";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/** Min live wines (wine ∧ producer) for sitemap + indexable region pages. */
export const WINE_REGION_INDEX_MIN_LIVE = 3;

export const WINE_REGIONS = [
  {
    slug: "languedoc",
    value: "Languedoc",
    labelSv: "Languedoc",
    labelEn: "Languedoc",
    /** EN H1/intro: "Natural wine from the Languedoc" */
    h1EnArticle: "the" as const,
  },
  {
    slug: "beaujolais",
    value: "Beaujolais",
    labelSv: "Beaujolais",
    labelEn: "Beaujolais",
    h1EnArticle: null,
  },
  {
    slug: "loire",
    value: "Loire",
    labelSv: "Loire",
    labelEn: "Loire",
    h1EnArticle: "the" as const,
  },
  {
    slug: "bourgogne",
    value: "Bourgogne",
    labelSv: "Bourgogne",
    labelEn: "Burgundy",
    h1EnArticle: null,
  },
  {
    slug: "jura",
    value: "Jura",
    labelSv: "Jura",
    labelEn: "Jura",
    h1EnArticle: "the" as const,
  },
  {
    slug: "champagne",
    value: "Champagne",
    labelSv: "Champagne",
    labelEn: "Champagne",
    h1EnArticle: null,
  },
  {
    slug: "rhone",
    value: "Rhône",
    labelSv: "Rhône",
    labelEn: "Rhône Valley",
    h1EnArticle: "the" as const,
  },
  {
    slug: "roussillon",
    value: "Roussillon",
    labelSv: "Roussillon",
    labelEn: "Roussillon",
    h1EnArticle: null,
  },
  {
    slug: "alsace",
    value: "Alsace",
    labelSv: "Alsace",
    labelEn: "Alsace",
    h1EnArticle: null,
  },
  {
    slug: "sud-ouest",
    value: "Sud-Ouest",
    labelSv: "Sydvästra Frankrike (Sud-Ouest)",
    labelEn: "Southwest France",
    h1EnArticle: null,
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
  "Southwest France": "Sud-Ouest",
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

/** EN phrase used in H1 / intro: "the Loire" or "Burgundy". */
export function wineRegionEnWithArticle(region: WineRegion): string {
  return region.h1EnArticle
    ? `${region.h1EnArticle} ${region.labelEn}`
    : region.labelEn;
}

/** Visible H1 — Margaux copy. */
export function wineRegionPageH1(
  region: WineRegion,
  locale: AppLocale,
): string {
  if (locale === "sv") {
    return `Naturvin från ${region.labelSv}`;
  }
  return `Natural wine from ${wineRegionEnWithArticle(region)}`;
}

/** Document title (absolute) — Margaux copy. */
export function wineRegionPageTitle(region: WineRegion, locale: AppLocale): string {
  if (locale === "sv") {
    return `Naturvin från ${region.labelSv} – producenter och stil | PACT`;
  }
  return `${region.labelEn} Natural Wine – Producers & Styles | PACT`;
}

/**
 * Meta description templates (target 130–160 characters).
 * SV ends with Budbee; EN has no delivery promise. Never "hela Sverige".
 */
export function wineRegionPageMetaDescription(
  region: WineRegion,
  locale: AppLocale,
): string {
  if (locale === "sv") {
    return `Naturvin från ${region.labelSv} hos PACT – producenter, druvor och stilar i urvalet. Regionfakta, producentprofiler och hemleverans med Budbee.`;
  }
  return `${region.labelEn} natural wine at PACT – producers, grapes and styles from the current selection, with region facts and related producer guides.`;
}

/**
 * Parse `?region=` query values (comma-separated and/or repeated params).
 * Invalid slugs are dropped; order is de-duplicated, keep first-seen.
 */
export function parseWineRegionParam(
  raw: string | string[] | undefined | null,
): WineRegionSlug[] {
  if (raw == null) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  const out: WineRegionSlug[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (typeof part !== "string" || !part.trim()) continue;
    for (const token of part.split(",")) {
      const slug = token.trim().toLowerCase();
      if (!isWineRegionSlug(slug) || seen.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

/** Serialize selected region slugs for URLs — unique, alphabetical. */
export function serializeWineRegionParam(
  slugs: readonly string[],
): string | null {
  const unique = [
    ...new Set(
      slugs
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is WineRegionSlug => isWineRegionSlug(s)),
    ),
  ].sort();
  return unique.length ? unique.join(",") : null;
}

/**
 * Count products by canonical `wines.region` value (NULL ignored).
 *
 * Callers must pass the same catalog the PLP shows: rows already gated by
 * `wines.is_live ∧ producers.is_live` (see `fetchProductsData`). Counting
 * `wines.is_live` alone over-counts (e.g. Jura / Braconnage when the producer
 * is not live) and would surface chips for regions with zero PLP wines.
 */
export function countLiveWinesByRegionValue(
  products: ReadonlyArray<{ region?: string | null }>,
): Map<WineRegionValue, number> {
  const counts = new Map<WineRegionValue, number>();
  for (const product of products) {
    const value = product.region;
    if (!isWineRegionValue(value)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/**
 * Shared ≥1-live linkability gate for PLP chips, region pages, sitemap, guides.
 * Pass live-wine counts keyed by canonical region **value** (French name).
 * “Live” = PLP-visible (wine ∧ producer `is_live`), not wine-only.
 * Later PRs reuse this — never link / show a region with fewer than `minLive` wines.
 */
export function getLinkableWineRegions(
  liveCountsByValue: ReadonlyMap<string, number>,
  minLive = 1,
): WineRegion[] {
  return WINE_REGIONS.filter(
    (region) => (liveCountsByValue.get(region.value) ?? 0) >= minLive,
  );
}

export function isWineRegionLinkable(
  slugOrValue: string,
  liveCountsByValue: ReadonlyMap<string, number>,
  minLive = 1,
): boolean {
  const region =
    wineRegionBySlug(slugOrValue) ?? wineRegionByValue(slugOrValue);
  if (!region) return false;
  return (liveCountsByValue.get(region.value) ?? 0) >= minLive;
}

/**
 * Convenience: linkable regions from a PLP product list (already wine∧producer live).
 */
export function getLinkableWineRegionsFromProducts(
  products: ReadonlyArray<{ region?: string | null }>,
  minLive = 1,
): WineRegion[] {
  return getLinkableWineRegions(
    countLiveWinesByRegionValue(products),
    minLive,
  );
}

export type WineRegionPathSegment = "region" | "regions";

/** Path segment for locale: SV `/region`, EN `/regions`. */
export function wineRegionPathSegment(
  locale: AppLocale,
): WineRegionPathSegment {
  return locale === "en" ? "regions" : "region";
}

/** Absolute path for a region landing page (no linkability gate). */
export function wineRegionPagePath(
  slug: WineRegionSlug,
  locale: AppLocale,
): string {
  return `/${wineRegionPathSegment(locale)}/${slug}`;
}

export function wineRegionPageUrls(slug: WineRegionSlug): {
  en: string;
  sv: string;
  xDefault: string;
} {
  return {
    en: `${PACT_PUBLIC_ORIGIN}${wineRegionPagePath(slug, "en")}`,
    sv: `${PACT_PUBLIC_ORIGIN}${wineRegionPagePath(slug, "sv")}`,
    xDefault: `${PACT_PUBLIC_ORIGIN}${wineRegionPagePath(slug, "en")}`,
  };
}

/**
 * Shared gate for every href to a region landing page.
 * Returns null when the region would 404 (<1 live wine, wine ∧ producer).
 * PLP chips, sitemap, guides, and internal links must use this (or
 * `isWineRegionLinkable` / `getLinkableWineRegions` with the same counts).
 */
export function getWineRegionPageHref(
  slugOrValue: string,
  locale: AppLocale,
  liveCountsByValue: ReadonlyMap<string, number>,
  minLive = 1,
): string | null {
  const region =
    wineRegionBySlug(slugOrValue) ?? wineRegionByValue(slugOrValue);
  if (!region) return null;
  if (!isWineRegionLinkable(region.slug, liveCountsByValue, minLive)) {
    return null;
  }
  return wineRegionPagePath(region.slug, locale);
}

/** Switch `/region/{slug}` ↔ `/regions/{slug}` for the locale switcher. */
export function switchWineRegionPath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  const match = pathname.match(/^\/(region|regions)\/([^/?#]+)\/?$/);
  if (!match) return null;
  const slug = decodeURIComponent(match[2]).toLowerCase();
  if (!isWineRegionSlug(slug)) return null;
  return wineRegionPagePath(slug, newLocale);
}
