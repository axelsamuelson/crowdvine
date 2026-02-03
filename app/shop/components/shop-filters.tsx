"use client";

import React, { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/shopify/types";
import Link from "next/link";
import { SidebarLinks } from "@/components/layout/sidebar/product-sidebar-links";
import { CategoryFilter } from "./category-filter";
import { ColorFilter } from "./color-filter";
import { GrapesFilter } from "./grapes-filter";
import { useProducts } from "../providers/products-provider";
import { useFilterCount } from "../hooks/use-filter-count";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

export function DesktopFilters({
  collections,
  className,
}: {
  collections: Collection[];
  className?: string;
}) {
  const { originalProducts } = useProducts();
  const filterCount = useFilterCount();
  const [seeAllOpen, setSeeAllOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "grid sticky top-top-spacing grid-cols-3 h-[calc(100vh-var(--top-spacing))] pl-sides",
          className,
        )}
      >
        <div className="flex flex-col col-span-3 xl:col-span-2 gap-4">
          <div className="flex justify-between items-baseline pl-2 -mb-2">
            <h2 className="text-2xl font-semibold">
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
          <Suspense fallback={null}>
            <CategoryFilter
              collections={collections}
              mode="sidebar"
              onSeeAll={() => setSeeAllOpen(true)}
            />
            <ColorFilter products={originalProducts} />
          </Suspense>
        </div>

        <div className="col-span-3 self-end">
          <SidebarLinks className="flex-col-reverse py-sides" size="sm" />
        </div>
      </aside>

      {/* Full-screen "See all" overlay (desktop) */}
      <Dialog open={seeAllOpen} onOpenChange={setSeeAllOpen}>
        <DialogContent className="w-screen h-[100dvh] max-w-none left-0 top-0 translate-x-0 translate-y-0 p-0 sm:rounded-none">
          <div className="h-full w-full flex flex-col bg-background">
            <DialogHeader className="px-6 py-5 border-b border-border flex-row items-center justify-between space-y-0">
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
                  aria-label="Close"
                  onClick={() => setSeeAllOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <Suspense fallback={null}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                  <div className="lg:col-span-3">
                    <CategoryFilter collections={collections} mode="overlay" />
                  </div>
                  <div className="lg:col-span-2">
                    <div className="space-y-6">
                      <ColorFilter products={originalProducts} />
                      {/* Only shown in expanded ("See all") mode */}
                      <GrapesFilter products={originalProducts} />
                    </div>
                  </div>
                </div>
              </Suspense>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
