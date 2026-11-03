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
  getActiveGrapeFromPathname,
  getActiveWineRegionFromPathname,
  getCategoryUrlForGrape,
  getCategoryUrlForGrapeAndFarming,
  getWineCategoryFromPathname,
  isShopFilterNavigationPath,
} from "@/lib/wine-categories";
import {
  parseWineRegionParam,
  serializeWineRegionParam,
  wineRegionPagePath,
  type WineRegionSlug,
} from "@/lib/wine-regions";
import {
  getShopSegmentSlug,
  isGrapeCategory,
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

/**
 * Resolve the next clean shop category URL for a color/farming change.
 *
 * Natural wine is the default mode: a color with no organic/biodynamic filter
 * resolves to the *-natural-* (or *-naturvin) page. Clearing farming from an
 * organic/biodynamic color page returns to that natural color page, not the
 * legacy color-only slug.
 */
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

/**
 * Keep active shop query filters (region, producers, sort, q, …) when jumping
 * between path-based category URLs. Call after gating so navigable-path checks
 * stay path-only. Does not alter canonical category URLs.
 */
export function withShopFilterSearchParams(
  path: string,
  search: string | URLSearchParams | null | undefined,
  options?: { omitKeys?: readonly string[] },
): string {
  if (!path) return path;
  const params = new URLSearchParams(
    typeof search === "string"
      ? search.replace(/^\?/, "")
      : (search?.toString() ?? ""),
  );
  for (const key of options?.omitKeys ?? []) {
    params.delete(key);
  }
  const qs = params.toString();
  if (!qs) {
    const bare = path.includes("?") ? path.slice(0, path.indexOf("?")) : path;
    return bare;
  }
  if (path.includes("?")) {
    const bare = path.slice(0, path.indexOf("?"));
    return `${bare}?${qs}`;
  }
  return `${path}?${qs}`;
}

/**
 * Main shop `?region=` with exactly one region and no other params → region PLP.
 * Colour, grape and multi-region URLs stay on the query (noindex).
 */
export function promoteShopRegionQueryToPath(url: string): string {
  if (!url) return url;
  const qIndex = url.indexOf("?");
  const path = qIndex >= 0 ? url.slice(0, qIndex) : url;
  if (path !== "/vin" && path !== "/wine") return url;

  const params = new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : "");
  if (params.size !== 1 || !params.has("region")) return url;

  const slugs = parseWineRegionParam(params.getAll("region"));
  if (slugs.length !== 1) return url;

  const locale = path === "/vin" ? "sv" : "en";
  return wineRegionPagePath(slugs[0], locale);
}

/**
 * When leaving a region PLP for a colour, farming or grape URL, keep that
 * region as `?region=` so the combination stays noindex.
 */
export function carryPathWineRegion(
  destination: string,
  currentPath: string,
): string {
  const region = getActiveWineRegionFromPathname(currentPath);
  if (!region || !destination) return destination;

  const qIndex = destination.indexOf("?");
  const destPath = qIndex >= 0 ? destination.slice(0, qIndex) : destination;
  if (getActiveWineRegionFromPathname(destPath)?.slug === region.slug) {
    return destination;
  }

  const params = new URLSearchParams(
    qIndex >= 0 ? destination.slice(qIndex + 1) : "",
  );
  if (!params.get("region")) {
    params.set("region", region.slug);
  }
  return withShopFilterSearchParams(destPath, params);
}

/**
 * Preserve query filters, carry a path region onto combo URLs, then collapse
 * a lone main-shop region or grape query onto its indexable path.
 */
export function finalizeShopFilterNavigationUrl(
  destination: string,
  currentPath: string,
  search: string | URLSearchParams | null | undefined,
  options?: { omitKeys?: readonly string[] },
): string {
  const preserved = withShopFilterSearchParams(destination, search, options);
  const withRegion = carryPathWineRegion(preserved, currentPath);
  return promoteShopRegionQueryToPath(promoteShopFgrapeQueryToPath(withRegion));
}

/** Selected region slugs: query wins; otherwise the region PLP in the path. */
export function selectedWineRegionSlugs(
  pathname: string,
  querySlugs: readonly string[],
): WineRegionSlug[] {
  const fromQuery = parseWineRegionParam(
    querySlugs.length ? querySlugs.join(",") : null,
  );
  if (fromQuery.length > 0) return fromQuery;
  const pathRegion = getActiveWineRegionFromPathname(pathname);
  return pathRegion ? [pathRegion.slug] : [];
}

/**
 * One region and no colour/farming/grape in the path → region PLP.
 * Clearing that region → shop root. Anything else stays on `?region=`.
 */
export function resolveRegionFilterNavigationUrl(options: {
  locale: "sv" | "en";
  currentPath: string;
  search: string | URLSearchParams | null | undefined;
  nextSlugs: readonly string[];
}): string {
  const { locale, currentPath } = options;
  const root = shopRoot(locale);
  const next = parseWineRegionParam(
    serializeWineRegionParam(options.nextSlugs) ?? "",
  );
  const pathRegion = getActiveWineRegionFromPathname(currentPath);
  const category = getWineCategoryFromPathname(currentPath);
  const hasOtherPathFilter = Boolean(
    category?.filter.color?.length ||
      category?.filter.farming?.length ||
      category?.filter.filterGrape ||
      getActiveGrapeFromPathname(currentPath),
  );

  const params = new URLSearchParams(
    typeof options.search === "string"
      ? options.search.replace(/^\?/, "")
      : (options.search?.toString() ?? ""),
  );
  params.delete("region");

  if (next.length === 1 && !hasOtherPathFilter) {
    return withShopFilterSearchParams(
      wineRegionPagePath(next[0], locale),
      params,
    );
  }

  if (next.length === 0 && pathRegion && !hasOtherPathFilter) {
    return withShopFilterSearchParams(root, params);
  }

  const base =
    pathRegion && !hasOtherPathFilter
      ? root
      : currentPath.split("?")[0] || root;
  if (next.length > 0) {
    params.set("region", next.join(","));
  }
  return withShopFilterSearchParams(base, params);
}

export function promoteShopFgrapeQueryToPath(url: string): string {
  if (!url) return url;
  const qIndex = url.indexOf("?");
  const path = qIndex >= 0 ? url.slice(0, qIndex) : url;
  if (path !== "/vin" && path !== "/wine") return url;

  const params = new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : "");
  const fgrape = params.get("fgrape");
  if (!fgrape?.trim()) return url;

  const locale = path === "/vin" ? "sv" : "en";
  const grapePath = getCategoryUrlForGrape(fgrape.trim(), locale);
  params.delete("fgrape");
  return withShopFilterSearchParams(grapePath, params);
}

export function shouldNavigateShopFilters(pathname: string): boolean {
  return isShopFilterNavigationPath(pathname);
}

/** Navigate to grape PLP from main shop or any grape category page. */
export function shouldNavigateGrapeFilter(
  pathname: string,
  grapeCandidates: string[] = [],
): boolean {
  if (pathname === "/vin" || pathname === "/wine") return true;

  const category = getWineCategoryFromPathname(pathname);
  if (category && isGrapeCategory(category)) return true;

  const slug = getShopSegmentSlug(pathname);
  if (slug && grapeCandidates.length > 0) {
    if (resolveGrapeNameFromSlug(slug, grapeCandidates)) return true;
  }

  return false;
}

export function resolveGrapePageUrl(
  locale: "sv" | "en",
  pathname: string,
  grapeName: string,
  grapeCandidates: string[] = [],
): string {
  const activeFarming = getActiveFarmingFromPathname(pathname);
  if (activeFarming) {
    const combo = getCategoryUrlForGrapeAndFarming(
      grapeName,
      activeFarming,
      locale,
    );
    if (combo) return combo;
  }

  return getCategoryUrlForGrape(grapeName, locale);
}

export function resolveGrapePageFarmingUrl(
  locale: "sv" | "en",
  pathname: string,
  farming: ShopFarmingFilterValue,
  clearFarming: boolean,
  grapeCandidates: string[] = [],
): string | null {
  const activeGrape = getActiveGrapeFromPathname(pathname, grapeCandidates);
  if (!activeGrape) return null;

  if (clearFarming) {
    return getCategoryUrlForGrape(activeGrape, locale);
  }

  return (
    getCategoryUrlForGrapeAndFarming(activeGrape, farming, locale) ??
    getCategoryUrlForGrape(activeGrape, locale)
  );
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
