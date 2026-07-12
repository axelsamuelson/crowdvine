import type { AppLocale } from "@/lib/i18n/locale";
import { shopPathForLocale } from "@/lib/i18n/localized-routes";

/** LONG_TAIL *-languedoc color shop slugs → primary GENERATED slug (same filter). */
const CANONICAL_TARGET_SLUG_SV: Record<string, string> = {
  "rott-naturvin-languedoc": "rott-naturvin",
  "vitt-naturvin-languedoc": "vitt-naturvin",
  "orange-naturvin-languedoc": "orange-naturvin",
  /** Noindexed two-color naturvin combos → single-color red hub. */
  "rod-och-orange-naturvin": "rott-naturvin",
  "rod-och-vit-naturvin": "rott-naturvin",
};

const CANONICAL_TARGET_SLUG_EN: Record<string, string> = {
  "red-natural-wine-languedoc": "red-natural-wine",
  "white-natural-wine-languedoc": "white-natural-wine",
  "orange-natural-wine-languedoc": "orange-natural-wine",
  "red-and-orange-natural-wine": "red-natural-wine",
  "red-and-white-natural-wine": "red-natural-wine",
};

export function shopCategoryCanonicalSlug(
  slug: string,
  locale: AppLocale,
): string {
  const map = locale === "sv" ? CANONICAL_TARGET_SLUG_SV : CANONICAL_TARGET_SLUG_EN;
  return map[slug] ?? slug;
}

export function shopCategoryCanonicalUrl(
  slug: string,
  locale: AppLocale,
  baseUrl: string,
): string {
  const targetSlug = shopCategoryCanonicalSlug(slug, locale);
  return `${baseUrl}${shopPathForLocale(locale)}/${targetSlug}`;
}
