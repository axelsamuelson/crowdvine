"use client";

import React, { Suspense, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/shopify/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
import { GrapesFilter } from "./grapes-filter";
import { FarmingFilter } from "./farming-filter";
import { CompetitorFilter, type PriceSourceForFilter } from "./competitor-filter";
import { ShopFilterSearch } from "./shop-filter-search";
import { useProducts } from "@/components/shop/products-provider";
import { useFilterCount } from "../hooks/use-filter-count";
import { isProducerBoxesPath } from "@/lib/producer-boxes/config";
import { ProducerBoxesCta } from "./producer-boxes-cta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
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

export function DesktopFilters({
  collections,
  priceSources = [],
  className,
  ssrPathname,
}: {
  collections: Collection[];
  priceSources?: PriceSourceForFilter[];
  className?: string;
  ssrPathname: string;
}) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const { originalProducts, setProducts } = useProducts();
  const filterCount = useFilterCount();
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const openSeeAll = () => setSeeAllOpen(true);
  const pathname = usePathname();
  const router = useRouter();
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
    return isSameColorSelection(pathname, colorName)
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
  };

  const resolveFarmingHref = (
    farming: ShopFarmingFilterValue,
  ): string | null => {
    const grapeUrl = resolveGrapePageFarmingUrl(
      locale,
      pathname,
      farming,
      isSameFarmingSelection(pathname, farming),
      grapeCandidates,
    );
    if (grapeUrl) return grapeUrl;
    if (!shouldNavigateShopFilters(pathname)) return null;
    return isSameFarmingSelection(pathname, farming)
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

  return (
    <>
      <aside
        aria-labelledby="shop-filter-label"
        className={cn(
          "sticky top-top-spacing self-start flex min-h-0 max-h-[calc(100vh-var(--top-spacing))] w-full flex-col pl-sides",
          className,
        )}
      >
        <div className="flex shrink-0 justify-between items-baseline pl-2 pb-2">
          <p id="shop-filter-label" className="text-xl font-semibold">
            {t("shop.filter")}{" "}
            {filterCount > 0 && (
              <span className="text-foreground/50">({filterCount})</span>
            )}
          </p>
          <Button
            size={"sm"}
            variant="ghost"
            aria-label={t("shop.clearAllFilters")}
            className="font-medium text-foreground/50 hover:text-foreground/60"
            asChild
          >
            <Link href={paths.shop} prefetch>
              {t("shop.clear")}
            </Link>
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain pb-4 pr-1">
          {isProducerBoxesPage ? null : (
            <ShopFilterSearch id="shop-search-desktop" />
          )}
          <Suspense fallback={null}>
            {isProducerBoxesPage ? null : (
              <>
                <ColorFilter
                  products={originalProducts}
                  showAllColors={showAllFilterColors || isColorCategoryPage}
                  activeColor={activeColorName ?? undefined}
                  onColorSelect={handleColorSelect}
                  getColorHref={resolveColorHref}
                />
                <FarmingFilter
                  products={originalProducts}
                  mode="sidebar"
                  onSeeAll={openSeeAll}
                  onFarmingSelect={handleFarmingSelect}
                  activeFarming={activeFarming ?? undefined}
                  getFarmingHref={resolveFarmingHref}
                />
                <GrapesFilter
                  products={originalProducts}
                  mode="sidebar"
                  onSeeAll={openSeeAll}
                  onGrapeSelect={handleGrapeSelect}
                  activeGrape={activeGrapeName ?? undefined}
                />
              </>
            )}
            <CategoryFilter
              collections={collections}
              mode="sidebar"
              onSeeAll={openSeeAll}
            />
            {isProducerBoxesPage ? null : (
              <CompetitorFilter
                sources={priceSources}
                mode="sidebar"
                onSeeAll={openSeeAll}
              />
            )}
          </Suspense>
          <ProducerBoxesCta
            className="mt-2 h-11 w-full px-5"
            ssrPathname={ssrPathname}
          />
        </div>
      </aside>

      {/* Full-screen "See all" overlay (desktop) */}
      <Dialog open={seeAllOpen} onOpenChange={setSeeAllOpen}>
        <DialogContent hideCloseButton className="w-screen h-[100dvh] max-w-none left-0 top-0 translate-x-0 translate-y-0 p-0 sm:rounded-none">
          <div className="h-full w-full flex flex-col bg-background min-h-0">
            <DialogHeader className="shrink-0 px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0">
              <DialogTitle className="text-xl font-semibold">
                {t("shop.filtersTitle")}{" "}
                {filterCount > 0 && (
                  <span className="text-muted-foreground">({filterCount})</span>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "font-medium text-foreground/50 hover:text-foreground/60 transition-opacity",
                    filterCount === 0 && "opacity-0 pointer-events-none",
                  )}
                  disabled={filterCount === 0}
                  asChild={filterCount > 0}
                >
                  <Link href={paths.shop} prefetch>
                    {t("shop.clear")}
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("shop.close")}
                  onClick={() => setSeeAllOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              <Suspense fallback={null}>
                {isProducerBoxesPage ? null : (
                  <ShopFilterSearch
                    className="mb-6 max-w-md"
                    id="shop-search-overlay"
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                  {isProducerBoxesPage ? null : (
                    <>
                      <ColorFilter
                        products={originalProducts}
                        showAllColors={showAllFilterColors || isColorCategoryPage}
                        activeColor={activeColorName ?? undefined}
                        onColorSelect={handleColorSelect}
                        getColorHref={resolveColorHref}
                      />
                      <FarmingFilter
                        products={originalProducts}
                        mode="overlay"
                        onFarmingSelect={handleFarmingSelect}
                        activeFarming={activeFarming ?? undefined}
                        getFarmingHref={resolveFarmingHref}
                      />
                      <GrapesFilter
                        products={originalProducts}
                        mode="overlay"
                        onGrapeSelect={handleGrapeSelect}
                        activeGrape={activeGrapeName ?? undefined}
                      />
                    </>
                  )}
                  <CategoryFilter collections={collections} mode="overlay" />
                  {isProducerBoxesPage ? null : (
                    <CompetitorFilter sources={priceSources} mode="overlay" />
                  )}
                </div>
              </Suspense>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
