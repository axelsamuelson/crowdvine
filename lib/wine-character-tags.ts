import { z } from "zod";

import type { AppLocale } from "@/lib/i18n/locale";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/** Min live wines (wine ∧ producer) for sitemap + indexable character pages. */
export const WINE_CHARACTER_INDEX_MIN_LIVE = 3;

/**
 * Filter values shown in Karaktär / Character, in display order.
 * URL uses the value; database tags may be one or more per value.
 */
export const WINE_CHARACTER_FILTER_VALUES = [
  "light_easy",
  "fruit_forward",
  "mineral",
  "dinner",
  "aperitif",
  "everyday",
  "classic",
  "first_natural",
  "complex",
  "unusual",
] as const;

export type WineCharacterFilterValue =
  (typeof WINE_CHARACTER_FILTER_VALUES)[number];

export type WineCharacterFilterDef = {
  value: WineCharacterFilterValue;
  sv: string;
  en: string;
  /** Database `wines.tags` values that match this filter value (ANY). */
  tags: readonly string[];
};

/**
 * Character filter mapping. Only these ten values appear in the UI.
 * Hidden DB tags (terroir_showcase, social_wine, winemaker_signature,
 * collectors_item, celebration) stay in the database but are not listed.
 */
export const WINE_CHARACTER_FILTERS = [
  {
    value: "light_easy",
    sv: "Lättdrucket",
    en: "Easy-drinking",
    tags: ["light_easy"],
  },
  {
    value: "fruit_forward",
    sv: "Fruktigt",
    en: "Fruit-forward",
    tags: ["fruit_forward"],
  },
  {
    value: "mineral",
    sv: "Mineraliskt",
    en: "Mineral",
    tags: ["mineral_driven"],
  },
  {
    value: "dinner",
    sv: "Till middagen",
    en: "With dinner",
    tags: ["dinner_wine"],
  },
  {
    value: "aperitif",
    sv: "Aperitif",
    en: "Aperitif",
    tags: ["aperitif"],
  },
  {
    value: "everyday",
    sv: "Vardagsvin",
    en: "Everyday",
    tags: ["everyday"],
  },
  {
    value: "classic",
    sv: "Klassiskt",
    en: "Classic",
    tags: ["classic"],
  },
  {
    value: "first_natural",
    sv: "Bra första naturvin",
    en: "Good first natural wine",
    tags: ["gateway_natural"],
  },
  {
    value: "complex",
    sv: "Komplext",
    en: "Complex",
    tags: ["structured", "complex"],
  },
  {
    value: "unusual",
    sv: "Udda",
    en: "Unusual",
    tags: ["out_of_the_ordinary", "funky_wild"],
  },
] as const satisfies readonly WineCharacterFilterDef[];

/** Only light_easy gets an indexable path page for now. */
export const WINE_CHARACTER_PATH_VALUE = "light_easy" as const satisfies WineCharacterFilterValue;

const CHARACTER_BY_VALUE = new Map(
  WINE_CHARACTER_FILTERS.map((def) => [def.value, def]),
);

const wineCharacterFilterValueSchema = z.enum(WINE_CHARACTER_FILTER_VALUES);

export function isWineCharacterFilterValue(
  value: string,
): value is WineCharacterFilterValue {
  return wineCharacterFilterValueSchema.safeParse(value).success;
}

export function wineCharacterByValue(
  value: string,
): (typeof WINE_CHARACTER_FILTERS)[number] | null {
  if (!isWineCharacterFilterValue(value)) return null;
  return CHARACTER_BY_VALUE.get(value) ?? null;
}

export function wineCharacterLabel(
  value: WineCharacterFilterValue,
  locale: AppLocale,
): string {
  const def = CHARACTER_BY_VALUE.get(value);
  if (!def) return value;
  return locale === "en" ? def.en : def.sv;
}

/** Stable sort for URL serialization (filter-definition order). */
export function sortWineCharacterValues(
  values: readonly string[],
): WineCharacterFilterValue[] {
  const wanted = new Set(
    values.filter((v): v is WineCharacterFilterValue =>
      isWineCharacterFilterValue(v),
    ),
  );
  return WINE_CHARACTER_FILTER_VALUES.filter((v) => wanted.has(v));
}

/**
 * Parse `?character=` (comma-separated or repeated). Unknown values ignored.
 * Validated with Zod.
 */
export function parseWineCharacterParam(
  raw: string | string[] | null | undefined,
): WineCharacterFilterValue[] {
  const parts: string[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry !== "string") continue;
      parts.push(...entry.split(","));
    }
  } else if (typeof raw === "string") {
    parts.push(...raw.split(","));
  }

  const parsed: WineCharacterFilterValue[] = [];
  const seen = new Set<WineCharacterFilterValue>();
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const result = wineCharacterFilterValueSchema.safeParse(trimmed);
    if (!result.success) continue;
    if (seen.has(result.data)) continue;
    seen.add(result.data);
    parsed.push(result.data);
  }
  return sortWineCharacterValues(parsed);
}

export function serializeWineCharacterParam(
  values: readonly string[],
): string | null {
  const sorted = sortWineCharacterValues(values);
  return sorted.length > 0 ? sorted.join(",") : null;
}

/** DB tags that match any of the selected filter values (union). */
export function wineCharacterDbTagsForValues(
  values: readonly WineCharacterFilterValue[],
): string[] {
  const tags = new Set<string>();
  for (const value of values) {
    const def = CHARACTER_BY_VALUE.get(value);
    if (!def) continue;
    for (const tag of def.tags) tags.add(tag);
  }
  return [...tags];
}

/** A wine matches when it has ANY tag belonging to ANY selected value. */
export function productMatchesCharacterValues(
  tasteTags: readonly string[] | null | undefined,
  values: readonly WineCharacterFilterValue[],
): boolean {
  if (!values.length) return true;
  if (!tasteTags?.length) return false;
  const wanted = new Set(wineCharacterDbTagsForValues(values));
  return tasteTags.some((tag) => wanted.has(tag));
}

/** Which filter values a product's taste tags map to. */
export function characterValuesForTasteTags(
  tasteTags: readonly string[] | null | undefined,
): WineCharacterFilterValue[] {
  if (!tasteTags?.length) return [];
  const tagSet = new Set(tasteTags);
  return WINE_CHARACTER_FILTER_VALUES.filter((value) => {
    const def = CHARACTER_BY_VALUE.get(value);
    if (!def) return false;
    return def.tags.some((tag) => tagSet.has(tag));
  });
}

export function wineCharacterPagePath(
  value: WineCharacterFilterValue,
  locale: AppLocale,
): string | null {
  if (value !== WINE_CHARACTER_PATH_VALUE) return null;
  return locale === "en"
    ? "/wine/easy-drinking-natural-wine"
    : "/vin/lattdruckna-naturviner";
}

export function wineCharacterPageSlug(
  value: WineCharacterFilterValue,
  locale: AppLocale,
): string | null {
  if (value !== WINE_CHARACTER_PATH_VALUE) return null;
  return locale === "en"
    ? "easy-drinking-natural-wine"
    : "lattdruckna-naturviner";
}

export function wineCharacterFromShopSlug(
  slug: string,
): WineCharacterFilterValue | null {
  if (slug === "lattdruckna-naturviner" || slug === "easy-drinking-natural-wine") {
    return WINE_CHARACTER_PATH_VALUE;
  }
  return null;
}

export function wineCharacterPageUrls(value: WineCharacterFilterValue): {
  en: string;
  sv: string;
  xDefault: string;
} | null {
  const en = wineCharacterPagePath(value, "en");
  const sv = wineCharacterPagePath(value, "sv");
  if (!en || !sv) return null;
  return {
    en: `${PACT_PUBLIC_ORIGIN}${en}`,
    sv: `${PACT_PUBLIC_ORIGIN}${sv}`,
    xDefault: `${PACT_PUBLIC_ORIGIN}${en}`,
  };
}

export function isWineCharacterLinkable(
  value: WineCharacterFilterValue,
  liveCountsByValue: ReadonlyMap<string, number>,
  minLive = 1,
): boolean {
  return (liveCountsByValue.get(value) ?? 0) >= minLive;
}

export function getWineCharacterPageHref(
  value: WineCharacterFilterValue,
  locale: AppLocale,
  liveCountsByValue: ReadonlyMap<string, number>,
  minLive = 1,
): string | null {
  if (!isWineCharacterLinkable(value, liveCountsByValue, minLive)) {
    return null;
  }
  return wineCharacterPagePath(value, locale);
}

/** Sitemap paths for character pages with enough live wines. */
export function indexableWineCharacterPaths(
  liveCountsByValue: ReadonlyMap<string, number>,
): Array<{ sv: string; en: string }> {
  const sv = getWineCharacterPageHref(
    WINE_CHARACTER_PATH_VALUE,
    "sv",
    liveCountsByValue,
    WINE_CHARACTER_INDEX_MIN_LIVE,
  );
  const en = getWineCharacterPageHref(
    WINE_CHARACTER_PATH_VALUE,
    "en",
    liveCountsByValue,
    WINE_CHARACTER_INDEX_MIN_LIVE,
  );
  if (!sv || !en) return [];
  return [{ sv, en }];
}
