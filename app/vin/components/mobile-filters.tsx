"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/shopify/types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
import { GrapesFilter } from "./grapes-filter";
import { FarmingFilter } from "./farming-filter";
import { RegionFilter } from "./region-filter";
import { CompetitorFilter, type PriceSourceForFilter } from "./competitor-filter";
import { useFilterCount } from "../hooks/use-filter-count";
import { isProducerBoxesPath } from "@/lib/producer-boxes/config";
import { ProducerBoxesCta } from "./producer-boxes-cta";
import { useProducts } from "@/components/shop/products-provider";
import { ResultsCount } from "./results-count";
import { ShopMobileDock } from "./shop-mobile-dock";
import { ShopMobileSearchSheet } from "./shop-mobile-search-sheet";
import { ShopMobileSortSheet } from "./shop-mobile-sort-sheet";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import {
  isWineRegionSlug,
  serializeWineRegionParam,
  wineRegionLabel,
  type WineRegionSlug,
} from "@/lib/wine-regions";
import {
  getActiveColorFromPathname,
  getActiveFarmingFromPathname,
  getActiveGrapeFromPathname,
} from "@/lib/wine-categories";
import {
  isSameColorSelection,
  isSameFarmingSelection,
  localeFromShopPathname,
  resolveGrapePageFarmingUrl,
  resolveGrapePageUrl,
  resolveShopFilterNavigationUrl,
  shouldNavigateGrapeFilter,
  shouldNavigateShopFilters,
  withShopFilterSearchParams,
} from "@/lib/shop/filter-navigation";
import type { ShopFarmingFilterValue } from "@/lib/shop/farming-filter";
import { gateShopFilterHref } from "@/lib/shop/gate-shop-filter-href";
import { filterProductsByGrapes } from "@/lib/shop/filter-products-by-grape";
import { extractGrapesFromProducts } from "../hooks/use-available-grapes";

interface MobileFiltersProps {
  collections: Collection[];
  priceSources?: PriceSourceForFilter[];
  className?: string;
  /** SSR product count from server parent — avoids 0 → N jump on hydration. */
  resultsCount?: number;
  /** SSR active filter count parsed from URL search params. */
  initialFilterCount?: number;
  /** Pathname from the request. Fallback when usePathname is empty during SSR. */
  ssrPathname: string;
  /** Category paths with products for this site (sitemap emptiness rule). */
  navigableShopPaths?: readonly string[];
}

export function MobileFilters({
  collections,
  priceSources = [],
  className,
  resultsCount: resultsCountProp,
  initialFilterCount = 0,
  ssrPathname,
  navigableShopPaths,
}: MobileFiltersProps) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const clientFilterCount = useFilterCount();
  const { products, originalProducts, setProducts, serverResultsCount } =
    useProducts();
  const routerPathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedRegions, setSelectedRegions] = useQueryState(
    "region",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  // Prefer the live router path when present; fall back to the request path
  // so SSR and the first client render share the same hrefs (no mounted flip).
  const pathname = routerPathname || ssrPathname;
  const isProducerBoxesPage = isProducerBoxesPath(pathname);
  const isColorCategoryPage =
    !isProducerBoxesPage &&
    (pathname.startsWith("/vin/") || pathname.startsWith("/wine/"));
  const showAllFilterColors =
    !isProducerBoxesPage && shouldNavigateShopFilters(pathname);
  const locale = localeFromShopPathname(pathname);
  const activeColorName = getActiveColorFromPathname(pathname);
  const activeFarming = getActiveFarmingFromPathname(pathname);
  const grapeCandidates = useMemo(
    () => extractGrapesFromProducts(originalProducts),
    [originalProducts],
  );
  const activeGrapeName = getActiveGrapeFromPathname(pathname, grapeCandidates);

  const resolveColorHref = (colorName: string): string | null => {
    if (!shouldNavigateShopFilters(pathname)) return null;
    const isClear = isSameColorSelection(pathname, colorName);
    const url = isClear
      ? resolveShopFilterNavigationUrl({
          locale,
          currentPath: pathname,
          clearColor: true,
        })
      : resolveShopFilterNavigationUrl({
          locale,
          currentPath: pathname,
          nextColorUi: colorName,
        });
    const gated = gateShopFilterHref(url, {
      isClear,
      navigablePaths: navigableShopPaths,
    });
    if (!gated) return null;
    return withShopFilterSearchParams(gated, searchParams);
  };

  const resolveFarmingHref = (
    farming: ShopFarmingFilterValue,
  ): string | null => {
    const isClear = isSameFarmingSelection(pathname, farming);
    const grapeUrl = resolveGrapePageFarmingUrl(
      locale,
      pathname,
      farming,
      isClear,
      grapeCandidates,
    );
    if (grapeUrl) {
      return gateShopFilterHref(grapeUrl, {
        isClear,
        navigablePaths: navigableShopPaths,
      });
    }
    if (!shouldNavigateShopFilters(pathname)) return null;
    const url = isClear
      ? resolveShopFilterNavigationUrl({
          locale,
          currentPath: pathname,
          clearFarming: true,
        })
      : resolveShopFilterNavigationUrl({
          locale,
          currentPath: pathname,
          nextFarming: farming,
        });
    return gateShopFilterHref(url, {
      isClear,
      navigablePaths: navigableShopPaths,
    });
  };

  const handleColorSelect = (colorName: string) => {
    const url = resolveColorHref(colorName);
    if (!url) return false;
    router.push(url);
    return true;
  };

  const handleFarmingSelect = (farming: ShopFarmingFilterValue): boolean => {
    const url = resolveFarmingHref(farming);
    if (!url) return false;
    router.push(url);
    return true;
  };

  const handleGrapeSelect = (grapeName: string): boolean => {
    if (!shouldNavigateGrapeFilter(pathname, grapeCandidates)) {
      return false;
    }

    const url = resolveGrapePageUrl(
      locale,
      pathname,
      grapeName,
      grapeCandidates,
    );

    if (pathname === url) {
      router.push(locale === "en" ? "/wine" : "/vin");
      return true;
    }

    const isMainShop = pathname === "/vin" || pathname === "/wine";
    if (isMainShop && originalProducts.length > 0) {
      setProducts(filterProductsByGrapes(originalProducts, [grapeName]));
    }
    router.push(url);
    return true;
  };

  const displayResultsCount =
    products.length > 0
      ? products.length
      : (resultsCountProp ?? serverResultsCount);
  const displayFilterCount =
    clientFilterCount > 0 ? clientFilterCount : initialFilterCount;

  const selectedRegionChips = useMemo(() => {
    const seen = new Set<string>();
    const chips: { slug: WineRegionSlug; label: string }[] = [];
    for (const raw of selectedRegions) {
      const slug = raw.trim().toLowerCase();
      if (!isWineRegionSlug(slug) || seen.has(slug)) continue;
      seen.add(slug);
      const label = wineRegionLabel(slug, locale);
      if (!label) continue;
      chips.push({ slug, label });
    }
    return chips.sort((a, b) => a.slug.localeCompare(b.slug));
  }, [selectedRegions, locale]);

  const removeRegion = (slug: WineRegionSlug) => {
    const next = selectedRegions.filter((s) => s !== slug);
    const serialized = serializeWineRegionParam(next);
    void setSelectedRegions(
      serialized ? (serialized.split(",") as WineRegionSlug[]) : null,
    );
  };

  return (
    <div className="overflow-x-clip bg-transparent md:hidden">
      {isProducerBoxesPage ? (
        <div className="px-sides py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="cursor-pointer text-sm font-semibold text-foreground"
            onClick={() => setFiltersOpen(true)}
          >
            {t("shop.filters")}
          </Button>
        </div>
      ) : selectedRegionChips.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-sides py-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedRegionChips.map((chip) => (
              <button
                key={chip.slug}
                type="button"
                onClick={() => removeRegion(chip.slug)}
                className="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[13px] text-[#0A0A0A]"
                aria-label={t("shop.clearRegionFilter", { name: chip.label })}
              >
                <span className="truncate">{chip.label}</span>
                <X aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
              </button>
            ))}
            <Link
              href={paths.shop}
              prefetch
              className="shrink-0 text-[13px] text-[#0A0A0A] underline underline-offset-2"
            >
              {t("shop.clear")}
            </Link>
          </div>
          <ResultsCount
            count={displayResultsCount}
            className="shrink-0 place-self-auto"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center px-sides py-1.5">
          <ResultsCount count={displayResultsCount} />
        </div>
      )}

      {/* Filter drawer — groups scroll; footer (Show + Se vinlådor) stays pinned */}
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className={cn("max-h-[90vh]", className)}>
          <DrawerHeader className="flex shrink-0 items-center justify-between">
            <DrawerTitle>
              {t("shop.filters")}{" "}
              <span
                className={cn(
                  "text-muted-foreground tabular-nums",
                  (isProducerBoxesPage || displayFilterCount === 0) &&
                    "invisible",
                )}
              >
                ({displayFilterCount || 0})
              </span>
            </DrawerTitle>
            {isProducerBoxesPage ? null : (
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "cursor-pointer font-medium text-foreground/50 transition-opacity hover:text-foreground/60",
                  displayFilterCount === 0 && "opacity-0 pointer-events-none",
                )}
                disabled={displayFilterCount === 0}
                asChild={displayFilterCount > 0}
              >
                <Link href={paths.shop} prefetch>
                  {t("shop.clear")}
                </Link>
              </Button>
            )}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <div className="flex flex-col gap-2 pb-2">
              {isProducerBoxesPage ? null : (
                <>
                  <ColorFilter
                    products={originalProducts}
                    showAllColors={showAllFilterColors || isColorCategoryPage}
                    activeColor={activeColorName ?? undefined}
                    onColorSelect={handleColorSelect}
                    getColorHref={resolveColorHref}
                    showSwatchLabels
                  />
                  <RegionFilter mode="drawer" />
                  <FarmingFilter
                    products={originalProducts}
                    mode="drawer"
                    onFarmingSelect={handleFarmingSelect}
                    activeFarming={activeFarming ?? undefined}
                    getFarmingHref={resolveFarmingHref}
                  />
                  <GrapesFilter
                    products={originalProducts}
                    mode="drawer"
                    onGrapeSelect={handleGrapeSelect}
                    activeGrape={activeGrapeName ?? undefined}
                  />
                </>
              )}
              <CategoryFilter collections={collections} mode="drawer" />
              {isProducerBoxesPage ? null : (
                <CompetitorFilter sources={priceSources} mode="drawer" />
              )}
            </div>
          </div>
          {isProducerBoxesPage ? null : (
            <div className="shrink-0 space-y-3 border-t border-border px-4 pb-6 pt-4">
              <Button
                type="button"
                className="h-11 w-full cursor-pointer rounded-full border-0 bg-[#0A0A0A] px-5 text-white shadow-none ring-0 ring-offset-0 hover:bg-[#0A0A0A]/90 hover:shadow-none focus-visible:ring-offset-0"
                onClick={() => setFiltersOpen(false)}
              >
                {t("shop.showWines", { count: displayResultsCount })}
              </Button>
              <ProducerBoxesCta
                variant="textLink"
                analyticsSource="mobile_filter_sheet"
                ssrPathname={ssrPathname}
              />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <ShopMobileSearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
      <ShopMobileSortSheet open={sortOpen} onOpenChange={setSortOpen} />

      {isProducerBoxesPage ? null : (
        <ShopMobileDock
          filterCount={displayFilterCount}
          onFilter={() => setFiltersOpen(true)}
          onSort={() => setSortOpen(true)}
          onSearch={() => setSearchOpen(true)}
        />
      )}
    </div>
  );
}
