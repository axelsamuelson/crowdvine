import type { ShopFarmingFilterValue } from "@/lib/shop/farming-filter";
import {
  GENERATED_WINE_CATEGORIES_EN,
  GENERATED_WINE_CATEGORIES_SV,
  mapUiColorToDb,
  resolveShopFilterCategoryUrl,
} from "@/lib/wine-shop-filter-categories";
import {
  getActiveColorFromPathname,
  getActiveFarmingFromPathname,
  getWineCategoryFromPathname,
  isShopFilterNavigationPath,
} from "@/lib/wine-categories";
import {
  getShopSegmentSlug,
  isGrapeOnlyCategory,
  resolveGrapeNameFromSlug,
} from "@/lib/wine-grape-categories";

function categoriesForLocale(locale: "sv" | "en") {
  return locale === "sv"
    ? GENERATED_WINE_CATEGORIES_SV
    : GENERATED_WINE_CATEGORIES_EN;
}

function shopRoot(locale: "sv" | "en"): string {
  return locale === "en" ? "/wine" : "/vin";
}

export function resolveShopFilterNavigationUrl(options: {
  locale: "sv" | "en";
  currentPath: string;
  nextColorUi?: string | null;
  nextFarming?: ShopFarmingFilterValue | null;
  clearColor?: boolean;
  clearFarming?: boolean;
}): string {
  const { locale, currentPath } = options;
  const categories = categoriesForLocale(locale);
  const root = shopRoot(locale);

  let colorDb = getActiveColorFromPathname(currentPath);
  let farming = getActiveFarmingFromPathname(currentPath);

  if (options.clearColor) {
    colorDb = null;
  } else if (options.nextColorUi) {
    colorDb = mapUiColorToDb(options.nextColorUi);
  }

  if (options.clearFarming) {
    farming = null;
  } else if (options.nextFarming) {
    farming = options.nextFarming;
  }

  if (!colorDb && !farming) {
    return root;
  }

  return (
    resolveShopFilterCategoryUrl(locale, colorDb, farming, categories) ?? root
  );
}

export function shouldNavigateShopFilters(pathname: string): boolean {
  return isShopFilterNavigationPath(pathname);
}

/** Navigate to grape PLP only from main shop or grape-only category pages. */
export function shouldNavigateGrapeFilter(
  pathname: string,
  grapeCandidates: string[] = [],
): boolean {
  if (pathname === "/vin" || pathname === "/wine") return true;

  const category = getWineCategoryFromPathname(pathname);
  if (category && isGrapeOnlyCategory(category)) return true;

  const slug = getShopSegmentSlug(pathname);
  if (slug && grapeCandidates.length > 0) {
    if (resolveGrapeNameFromSlug(slug, grapeCandidates)) return true;
  }

  return false;
}

export function localeFromShopPathname(pathname: string): "sv" | "en" {
  return pathname.startsWith("/wine") ? "en" : "sv";
}

export function isSameColorSelection(
  pathname: string,
  colorUi: string,
): boolean {
  const active = getActiveColorFromPathname(pathname);
  if (!active) return false;
  return active === mapUiColorToDb(colorUi);
}

export function isSameFarmingSelection(
  pathname: string,
  farming: ShopFarmingFilterValue,
): boolean {
  return getActiveFarmingFromPathname(pathname) === farming;
}

export function getWineCategoryFromPath(pathname: string) {
  return getWineCategoryFromPathname(pathname);
}
