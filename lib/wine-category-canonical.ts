import type { AppLocale } from "@/lib/i18n/locale";
import { shopPathForLocale } from "@/lib/i18n/localized-routes";

/** Noindexed two-color naturvin combos → single-color red hub. */
const CANONICAL_TARGET_SLUG_SV: Record<string, string> = {
  "rod-och-orange-naturvin": "rott-naturvin",
  "rod-och-vit-naturvin": "rott-naturvin",
};

const CANONICAL_TARGET_SLUG_EN: Record<string, string> = {
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
