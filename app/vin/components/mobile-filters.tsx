"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/shopify/types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
import { GrapesFilter } from "./grapes-filter";
import { FarmingFilter } from "./farming-filter";
import { CompetitorFilter, type PriceSourceForFilter } from "./competitor-filter";
import { useFilterCount } from "../hooks/use-filter-count";
import { useProducts } from "@/components/shop/products-provider";
import { ResultsCount } from "./results-count";
import { SortDropdown } from "./sort-dropdown";
import { ShopFilterSearch } from "./shop-filter-search";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import {
  getActiveColorFromPathname,
  getActiveFarmingFromPathname,
  getActiveGrapeFromPathname,
  getCategoryUrlForGrape,
} from "@/lib/wine-categories";
import {
  isSameColorSelection,
  isSameFarmingSelection,
  localeFromShopPathname,
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
}

export function MobileFilters({ collections, priceSources = [], className }: MobileFiltersProps) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const filterCount = useFilterCount();
  const { products, originalProducts, setProducts } = useProducts();
  const [isMounted, setIsMounted] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isColorCategoryPage =
    pathname.startsWith("/vin/") || pathname.startsWith("/wine/");
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

    const url = getCategoryUrlForGrape(grapeName, locale);

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

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Avoid hydration mismatch: products/filter state may update before this component hydrates.
  const safeResultsCount = isMounted ? products.length : 0;
  const safeFilterCount = isMounted ? filterCount : 0;

  return (
    <div className="bg-transparent md:hidden overflow-x-clip">
      <Drawer>
        {/* 3 main items: Filters, Results count, Sort by */}
        <div className="grid grid-cols-3 items-center px-sides py-2">
          {/* Filters */}
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start text-sm font-semibold text-foreground"
            >
              {t("shop.filters")}{" "}
              {safeFilterCount > 0 && (
                <span className="text-foreground/50">({safeFilterCount})</span>
              )}
            </Button>
          </DrawerTrigger>

          {/* Results count */}
          <ResultsCount count={safeResultsCount} />

          {/* Sort by */}
          <SortDropdown className="justify-self-end" />
        </div>

        {/* Drawer content */}
        <DrawerContent className={cn("h-[80vh]", className)}>
          <DrawerHeader className="flex justify-between items-center">
            <DrawerTitle>
              {t("shop.filters")}{" "}
              {safeFilterCount > 0 && (
                <span className="text-muted-foreground">({safeFilterCount})</span>
              )}
            </DrawerTitle>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "font-medium text-foreground/50 hover:text-foreground/60 transition-opacity",
                safeFilterCount === 0 && "opacity-0 pointer-events-none",
              )}
              disabled={safeFilterCount === 0}
              asChild={safeFilterCount > 0}
            >
              <Link href={paths.shop} prefetch>
                {t("shop.clear")}
              </Link>
            </Button>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-6">
            <ShopFilterSearch />
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
            <CategoryFilter collections={collections} mode="drawer" />
            <CompetitorFilter sources={priceSources} mode="drawer" />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
