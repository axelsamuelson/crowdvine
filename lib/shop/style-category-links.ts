import type { AppLocale } from "@/lib/i18n/locale";
import {
  getWineCategoryEn,
  getWineCategorySv,
  type WineCategory,
} from "@/lib/wine-categories";

export type StyleCategoryPillLink = {
  href: string;
  label: string;
  slug: string;
};

/** Color + style hubs shown as style pills on the shop root. */
export const SHOP_ROOT_STYLE_PILL_SLUGS_SV = [
  "rott-naturvin",
  "vitt-naturvin",
  "orange-naturvin",
  "mousserande-vin",
  "pet-nat",
] as const;

export const SHOP_ROOT_STYLE_PILL_SLUGS_EN = [
  "red-natural-wine",
  "white-natural-wine",
  "orange-natural-wine",
  "sparkling-wine",
  "pet-nat",
] as const;

/** Sparkling / pet nat only — used on color hubs ("Fler stilar"). */
export const SHOP_MORE_STYLES_PILL_SLUGS_SV = [
  "mousserande-vin",
  "pet-nat",
] as const;

export const SHOP_MORE_STYLES_PILL_SLUGS_EN = [
  "sparkling-wine",
  "pet-nat",
] as const;

export type ShopStyleFilterValue = "sparkling" | "pet_nat";

export const SHOP_STYLE_FILTER_VALUES = [
  "sparkling",
  "pet_nat",
] as const satisfies readonly ShopStyleFilterValue[];

const STYLE_FILTER_SLUG_SV: Record<ShopStyleFilterValue, string> = {
  sparkling: "mousserande-vin",
  pet_nat: "pet-nat",
};

const STYLE_FILTER_SLUG_EN: Record<ShopStyleFilterValue, string> = {
  sparkling: "sparkling-wine",
  pet_nat: "pet-nat",
};

function categoryForSlug(
  slug: string,
  locale: AppLocale,
): WineCategory | undefined {
  return locale === "sv" ? getWineCategorySv(slug) : getWineCategoryEn(slug);
}

/**
 * Short pill label from category h1 (strip trailing "naturvin" / "vin" /
 * "natural wine" / "wine"), so labels come from WINE_CATEGORIES, not literals.
 */
export function categoryPillShortLabel(category: WineCategory): string {
  const h1 = category.h1.trim();
  if (category.locale === "sv") {
    return h1
      .replace(/\s+naturvin$/i, "")
      .replace(/\s+vin$/i, "")
      .trim();
  }
  return h1
    .replace(/\s+natural wine$/i, "")
    .replace(/\s+wine$/i, "")
    .trim();
}

export function styleFilterCategorySlug(
  value: ShopStyleFilterValue,
  locale: AppLocale,
): string {
  return locale === "sv"
    ? STYLE_FILTER_SLUG_SV[value]
    : STYLE_FILTER_SLUG_EN[value];
}

export function getCategoryUrlForStyle(
  value: ShopStyleFilterValue,
  locale: AppLocale,
): string | null {
  const category = categoryForSlug(styleFilterCategorySlug(value, locale), locale);
  return category?.canonical ?? null;
}

export function getActiveStyleFromPathname(
  pathname: string,
): ShopStyleFilterValue | null {
  const match = pathname.match(/^\/(vin|wine)\/([^/?#]+)/);
  if (!match) return null;
  const locale: AppLocale = match[1] === "vin" ? "sv" : "en";
  const slug = match[2];
  for (const value of SHOP_STYLE_FILTER_VALUES) {
    if (styleFilterCategorySlug(value, locale) === slug) return value;
  }
  return null;
}

export function styleFilterLabel(
  value: ShopStyleFilterValue,
  locale: AppLocale,
): string {
  const category = categoryForSlug(styleFilterCategorySlug(value, locale), locale);
  return category ? categoryPillShortLabel(category) : value;
}

export function pillLinksFromSlugs(
  slugs: readonly string[],
  locale: AppLocale,
  navigablePaths: ReadonlySet<string>,
): StyleCategoryPillLink[] {
  const links: StyleCategoryPillLink[] = [];
  for (const slug of slugs) {
    const category = categoryForSlug(slug, locale);
    if (!category) continue;
    if (!navigablePaths.has(category.canonical)) continue;
    links.push({
      slug: category.slug,
      href: category.canonical,
      label: categoryPillShortLabel(category),
    });
  }
  return links;
}

/** Pure helper for tests: resolve root style pill links against a path set. */
export function resolveStylePillLinksForPaths(
  locale: AppLocale,
  navigablePaths: readonly string[],
  kind: "root" | "more-styles" = "root",
): StyleCategoryPillLink[] {
  const navigable = new Set(navigablePaths);
  const slugs =
    kind === "more-styles"
      ? locale === "sv"
        ? SHOP_MORE_STYLES_PILL_SLUGS_SV
        : SHOP_MORE_STYLES_PILL_SLUGS_EN
      : locale === "sv"
        ? SHOP_ROOT_STYLE_PILL_SLUGS_SV
        : SHOP_ROOT_STYLE_PILL_SLUGS_EN;
  return pillLinksFromSlugs(slugs, locale, navigable);
}
