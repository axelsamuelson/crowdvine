"use client";

import React, { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/shopify/types";
import Link from "next/link";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
import { GrapesFilter } from "./grapes-filter";
import { CompetitorFilter, type PriceSourceForFilter } from "./competitor-filter";
import { ShopFilterSearch } from "./shop-filter-search";
import { useProducts } from "../providers/products-provider";
import { useFilterCount } from "../hooks/use-filter-count";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

export function DesktopFilters({
  collections,
  priceSources = [],
  className,
}: {
  collections: Collection[];
  priceSources?: PriceSourceForFilter[];
  className?: string;
}) {
  const { originalProducts } = useProducts();
  const filterCount = useFilterCount();
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const openSeeAll = () => setSeeAllOpen(true);

  return (
    <>
      <aside
        className={cn(
          "sticky top-top-spacing self-start max-h-[calc(100vh-var(--top-spacing))] grid grid-cols-3 pl-sides",
          className,
        )}
      >
        <div className="flex flex-col col-span-3 xl:col-span-2 gap-2">
          <div className="flex justify-between items-baseline pl-2 -mb-1">
            <h2 className="text-xl font-semibold">
              Filter{" "}
              {filterCount > 0 && (
                <span className="text-foreground/50">({filterCount})</span>
              )}
            </h2>
            <Button
              size={"sm"}
              variant="ghost"
              aria-label="Clear all filters"
              className="font-medium text-foreground/50 hover:text-foreground/60"
              asChild
            >
              <Link href="/shop" prefetch>
                Clear
              </Link>
            </Button>
          </div>
          <ShopFilterSearch />
          <Suspense fallback={null}>
            <CategoryFilter
              collections={collections}
              mode="sidebar"
              onSeeAll={openSeeAll}
            />
            <CompetitorFilter
              sources={priceSources}
              mode="sidebar"
              onSeeAll={openSeeAll}
            />
            <GrapesFilter
              products={originalProducts}
              mode="sidebar"
              onSeeAll={openSeeAll}
            />
            <ColorFilter products={originalProducts} />
          </Suspense>
        </div>
      </aside>

      {/* Full-screen "See all" overlay (desktop) */}
      <Dialog open={seeAllOpen} onOpenChange={setSeeAllOpen}>
        <DialogContent hideCloseButton className="w-screen h-[100dvh] max-w-none left-0 top-0 translate-x-0 translate-y-0 p-0 sm:rounded-none">
          <div className="h-full w-full flex flex-col bg-background min-h-0">
            <DialogHeader className="shrink-0 px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0">
              <DialogTitle className="text-xl font-semibold">
                Filters {filterCount > 0 && <span className="text-muted-foreground">({filterCount})</span>}
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
                  <Link href="/shop" prefetch>
                    Clear
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Stäng"
                  onClick={() => setSeeAllOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              <Suspense fallback={null}>
                <ShopFilterSearch className="mb-6 max-w-md" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                  <CategoryFilter collections={collections} mode="overlay" />
                  <CompetitorFilter sources={priceSources} mode="overlay" />
                  <GrapesFilter products={originalProducts} mode="overlay" />
                  <ColorFilter products={originalProducts} />
                </div>
              </Suspense>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
