"use client";

import React from "react";
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
import { CompetitorFilter, type PriceSourceForFilter } from "./competitor-filter";
import { useFilterCount } from "../hooks/use-filter-count";
import { useProducts } from "../providers/products-provider";
import { ResultsCount } from "./results-count";
import { SortDropdown } from "./sort-dropdown";
import { ShopFilterSearch } from "./shop-filter-search";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { getCategoryUrlForColor, getCategoryUrlForGrape, getActiveGrapeFromPathname } from "@/lib/wine-categories";
import { filterProductsByGrapes } from "@/lib/shop/filter-products-by-grape";

function getActiveColorFromPathname(path: string): string | null {
  const colorMap: Record<string, string> = {
    "/vin/rott-naturvin": "Red",
    "/vin/vitt-naturvin": "White",
    "/vin/orange-naturvin": "Orange",
    "/vin/rod-och-vit-naturvin": "Red/White",
    "/vin/rod-och-orange-naturvin": "Red/Orange",
    "/wine/red-natural-wine": "Red",
    "/wine/white-natural-wine": "White",
    "/wine/orange-natural-wine": "Orange",
    "/wine/red-and-white-natural-wine": "Red/White",
    "/wine/red-and-orange-natural-wine": "Red/Orange",
  };
  return colorMap[path] ?? null;
}

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
  const locale = pathname.startsWith("/wine") ? "en" : "sv";
  const activeColorName = getActiveColorFromPathname(pathname);
  const activeGrapeName = getActiveGrapeFromPathname(pathname);

  const handleColorSelect = (colorName: string) => {
    const url = getCategoryUrlForColor(colorName, locale);

    const currentIsThisColor =
      (pathname.startsWith("/vin/") &&
        getCategoryUrlForColor(colorName, "sv") === pathname) ||
      (pathname.startsWith("/wine/") &&
        getCategoryUrlForColor(colorName, "en") === pathname);

    if (currentIsThisColor) {
      router.push(locale === "en" ? "/wine" : "/vin");
      return;
    }

    if (url) {
      router.push(url);
    }
  };

  const handleGrapeSelect = (grapeName: string): boolean => {
    const url = getCategoryUrlForGrape(grapeName, locale);

    if (url && pathname === url) {
      router.push(locale === "en" ? "/wine" : "/vin");
      return true;
    }

    if (url) {
      const isMainShop = pathname === "/vin" || pathname === "/wine";
      if (isMainShop && originalProducts.length > 0) {
        setProducts(filterProductsByGrapes(originalProducts, [grapeName]));
      }
      router.push(url);
      return true;
    }

    return false;
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
            <CategoryFilter collections={collections} mode="drawer" />
            <CompetitorFilter sources={priceSources} mode="drawer" />
            <GrapesFilter
              products={originalProducts}
              mode="drawer"
              onGrapeSelect={handleGrapeSelect}
              activeGrape={activeGrapeName ?? undefined}
            />
            <ColorFilter
              products={originalProducts}
              showAllColors={isColorCategoryPage}
              activeColor={activeColorName ?? undefined}
              onColorSelect={handleColorSelect}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
