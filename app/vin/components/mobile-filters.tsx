"use client";

import React, { useMemo, useState } from "react";
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
import { CompetitorFilter, type PriceSourceForFilter } from "./competitor-filter";
import { useFilterCount } from "../hooks/use-filter-count";
import { isProducerBoxesPath } from "@/lib/producer-boxes/config";
import { ProducerBoxesCta } from "./producer-boxes-cta";
import { useProducts } from "@/components/shop/products-provider";
import { ResultsCount } from "./results-count";
import { ShopFilterSearch } from "./shop-filter-search";
import { ShopMobileDock } from "./shop-mobile-dock";
import { ShopMobileSortSheet } from "./shop-mobile-sort-sheet";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
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
} from "@/lib/shop/filter-navigation";
import type { ShopFarmingFilterValue } from "@/lib/shop/farming-filter";
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
  /** Pathname from the request. The box CTA uses it until the client has mounted. */
  ssrPathname: string;
}

export function MobileFilters({
  collections,
  priceSources = [],
  className,
  resultsCount: resultsCountProp,
  initialFilterCount = 0,
  ssrPathname,
}: MobileFiltersProps) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const clientFilterCount = useFilterCount();
  const { products, originalProducts, setProducts, serverResultsCount } =
    useProducts();
  const pathname = usePathname();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isProducerBoxesPage = isProducerBoxesPath(pathname);
  const isColorCategoryPage =
    !isProducerBoxesPage &&
    (pathname.startsWith("/vin/") || pathname.startsWith("/wine/"));
  const locale = localeFromShopPathname(pathname);
  const activeColorName = getActiveColorFromPathname(pathname);
  const activeFarming = getActiveFarmingFromPathname(pathname);
  const grapeCandidates = useMemo(
    () => extractGrapesFromProducts(originalProducts),
    [originalProducts],
  );
  const activeGrapeName = getActiveGrapeFromPathname(pathname, grapeCandidates);

  const handleColorSelect = (colorName: string) => {
    if (!shouldNavigateShopFilters(pathname)) return false;

    const url = isSameColorSelection(pathname, colorName)
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
    router.push(url);
  };

  const handleFarmingSelect = (farming: ShopFarmingFilterValue): boolean => {
    const grapeUrl = resolveGrapePageFarmingUrl(
      locale,
      pathname,
      farming,
      isSameFarmingSelection(pathname, farming),
      grapeCandidates,
    );
    if (grapeUrl) {
      router.push(grapeUrl);
      return true;
    }

    if (!shouldNavigateShopFilters(pathname)) return false;

    const url = isSameFarmingSelection(pathname, farming)
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

  return (
    <div className="overflow-x-clip bg-transparent md:hidden">
      {isProducerBoxesPage ? null : (
        <div className="flex items-center gap-2 px-sides pb-1 pt-1">
          <ShopFilterSearch
            id="shop-search-mobile"
            className="min-w-0 flex-1"
          />
          <ProducerBoxesCta ssrPathname={ssrPathname} />
        </div>
      )}

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
      ) : (
        <div className="flex items-center justify-center px-sides py-1.5">
          <ResultsCount count={displayResultsCount} />
        </div>
      )}

      {/* Filter drawer */}
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className={cn("h-[80vh]", className)}>
          <DrawerHeader className="flex items-center justify-between">
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
          <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
            {isProducerBoxesPage ? null : (
              <>
                <ColorFilter
                  products={originalProducts}
                  showAllColors={isColorCategoryPage}
                  activeColor={activeColorName ?? undefined}
                  onColorSelect={handleColorSelect}
                />
                <FarmingFilter
                  products={originalProducts}
                  mode="drawer"
                  onFarmingSelect={handleFarmingSelect}
                  activeFarming={activeFarming ?? undefined}
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
        </DrawerContent>
      </Drawer>

      {/* Search drawer */}
      <Drawer open={searchOpen} onOpenChange={setSearchOpen}>
        <DrawerContent className="max-h-[50vh]">
          <DrawerHeader className="px-4 pb-2">
            <DrawerTitle>{t("shop.searchTitle")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">
            <ShopFilterSearch
              id="shop-search-dock"
              autoFocus={searchOpen}
            />
          </div>
        </DrawerContent>
      </Drawer>

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
