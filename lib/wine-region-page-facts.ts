import type { AppLocale } from "@/lib/i18n/locale";
import type { Product } from "@/lib/shopify/types";

/** Max grapes shown before “and N more”. */
export const WINE_REGION_GRAPE_DISPLAY_CAP = 12;

/** Strip diacritics / case / punctuation for grape & style matching. */
export function normalizeWineFactKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Canonical display names for known grape synonym / spelling variants.
 * Keys are normalizeWineFactKey results.
 */
const GRAPE_CANONICAL_BY_KEY: Record<string, string> = {
  mourvedre: "Mourvèdre",
  monastrell: "Mourvèdre",
  roussanne: "Roussanne",
  rousanne: "Roussanne",
  syrah: "Syrah",
  shiraz: "Syrah",
  "syrah shiraz": "Syrah",
};

/**
 * Raw values that look like data typos (not synonym merges).
 * Report only — do not rewrite / auto-correct in the UI.
 */
const GRAPE_TYPO_HINTS: Record<string, string> = {
  massanne: "Marsanne?",
};

export function grapeCanonicalDisplay(raw: string): string {
  const key = normalizeWineFactKey(raw);
  return GRAPE_CANONICAL_BY_KEY[key] ?? raw.trim();
}

/** Storage key after synonym collapse (Syrah / Shiraz / Syrah/Shiraz → one). */
export function grapeStorageKey(raw: string): string {
  return normalizeWineFactKey(grapeCanonicalDisplay(raw));
}

export function grapesLookingLikeTypos(
  rawGrapes: readonly string[],
): Array<{ raw: string; hint: string }> {
  const out: Array<{ raw: string; hint: string }> = [];
  const seen = new Set<string>();
  for (const raw of rawGrapes) {
    const key = normalizeWineFactKey(raw);
    const hint = GRAPE_TYPO_HINTS[key];
    if (!hint || seen.has(key)) continue;
    seen.add(key);
    out.push({ raw: raw.trim(), hint });
  }
  return out;
}

function productGrapeNames(product: Product): string[] {
  const grapeOption = product.options?.find(
    (opt) => opt.name === "Grape Varieties",
  );
  const names: string[] = [];
  for (const value of grapeOption?.values ?? []) {
    const name = typeof value === "string" ? value : value.name;
    const trimmed = name?.trim();
    if (trimmed) names.push(trimmed);
  }
  return names;
}

export type RegionGrapeList = {
  /** Display labels (capped). */
  labels: string[];
  /** Grapes omitted after the cap. */
  moreCount: number;
  /** All unique display labels before cap (for tests / reporting). */
  allLabels: string[];
  /** Raw grape strings that look like typos. */
  typoSuspects: Array<{ raw: string; hint: string }>;
};

/**
 * Dedupe grapes on normalized key (diacritics / case / known synonyms),
 * rank by wine count, cap at `limit`.
 */
export function grapesFromProducts(
  products: Product[],
  limit = WINE_REGION_GRAPE_DISPLAY_CAP,
): RegionGrapeList {
  const rawAll: string[] = [];
  const byKey = new Map<string, { display: string; count: number }>();

  for (const product of products) {
    const seenOnWine = new Set<string>();
    for (const raw of productGrapeNames(product)) {
      rawAll.push(raw);
      const key = grapeStorageKey(raw);
      if (!key || seenOnWine.has(key)) continue;
      seenOnWine.add(key);
      const canonical = grapeCanonicalDisplay(raw);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { display: canonical, count: 1 });
      } else {
        existing.count += 1;
        // Prefer a mapped canonical or a diacritic-bearing display form.
        if (
          normalizeWineFactKey(raw) in GRAPE_CANONICAL_BY_KEY ||
          (/[^\u0000-\u007f]/.test(canonical) &&
            !/[^\u0000-\u007f]/.test(existing.display))
        ) {
          existing.display = canonical;
        }
      }
    }
  }

  const ranked = [...byKey.values()].sort(
    (a, b) =>
      b.count - a.count || a.display.localeCompare(b.display, "sv"),
  );
  const allLabels = ranked.map((r) => r.display);
  const labels = allLabels.slice(0, Math.max(0, limit));
  const moreCount = Math.max(0, allLabels.length - labels.length);

  return {
    labels,
    moreCount,
    allLabels,
    typoSuspects: grapesLookingLikeTypos(rawAll),
  };
}

export function formatGrapeListLabel(
  list: RegionGrapeList,
  locale: AppLocale,
): string {
  if (list.labels.length === 0) return "";
  const base = list.labels.join(", ");
  if (list.moreCount <= 0) return base;
  const more =
    locale === "sv"
      ? `och ${list.moreCount} till`
      : `and ${list.moreCount} more`;
  return `${base}, ${more}`;
}

function styleBucket(raw: string): string | null {
  const key = normalizeWineFactKey(raw);
  if (!key) return null;
  if (/(^|\s)(red|rott|rod)(\s|$)/.test(key) || key === "rouge") return "red";
  if (/(^|\s)(white|vitt|vit|blanc)(\s|$)/.test(key)) return "white";
  if (/(^|\s)(rose|ros)(\s|$)/.test(key)) return "rose";
  if (/(^|\s)orange(\s|$)/.test(key)) return "orange";
  if (/(^|\s)(sparkling|mousserande|pet nat|petnat)(\s|$)/.test(key)) {
    return "sparkling";
  }
  return `other:${key}`;
}

function styleLabel(bucket: string, locale: AppLocale, raw: string): string {
  if (locale === "sv") {
    switch (bucket) {
      case "red":
        return "Rött";
      case "white":
        return "Vitt";
      case "rose":
        return "Rosé";
      case "orange":
        return "Orange";
      case "sparkling":
        return "Mousserande";
      default:
        return raw.trim();
    }
  }
  switch (bucket) {
    case "red":
      return "Red";
    case "white":
      return "White";
    case "rose":
      return "Rosé";
    case "orange":
      return "Orange";
    case "sparkling":
      return "Sparkling";
    default:
      return raw.trim();
  }
}

/** Dedupe styles on normalized color bucket → one localized label each. */
export function stylesFromProducts(
  products: Product[],
  locale: AppLocale,
): string[] {
  const byBucket = new Map<string, string>();
  for (const product of products) {
    const colorOption = product.options?.find((opt) => opt.name === "Color");
    const raw =
      typeof colorOption?.values?.[0] === "string"
        ? colorOption.values[0]
        : colorOption?.values?.[0]?.name;
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const bucket = styleBucket(trimmed);
    if (!bucket) continue;
    if (byBucket.has(bucket)) continue;
    byBucket.set(bucket, styleLabel(bucket, locale, trimmed));
  }
  return [...byBucket.values()].sort((a, b) => a.localeCompare(b, "sv"));
}
