"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CompleteOrderRailDynamic } from "@/components/layout/header/complete-order-rail-dynamic";
import { DesktopFilters } from "@/app/vin/components/shop-filters";
import { MobileFilters } from "@/app/vin/components/mobile-filters";
import type { Collection } from "@/lib/shopify/types";
import type { PriceSourceForFilter } from "@/app/vin/components/competitor-filter";
import { ProductsProvider } from "@/components/shop/products-provider";
import { isShopFullBleedPath } from "@/lib/stockholm-delivery-landing/config";

export function ShopLayoutClient({
  children,
  collections,
  priceSources,
  initialFilterCount = 0,
  initialResultsCount,
  ssrPathname,
  navigableShopPaths,
}: {
  children: ReactNode;
  collections: Collection[];
  priceSources: PriceSourceForFilter[];
  initialFilterCount?: number;
  /** SSR product count for mobile bar — avoids hydration mismatch. */
  initialResultsCount?: number;
  /** Pathname from the request. The CTA uses it until the client has mounted. */
  ssrPathname: string;
  /** Category paths with products for this site (sitemap emptiness rule). */
  navigableShopPaths?: string[];
}) {
  const pathname = usePathname() || ssrPathname;
  if (isShopFullBleedPath(pathname)) {
    return (
      <ProductsProvider initialServerResultsCount={initialResultsCount ?? 0}>
        <Suspense fallback={null}>{children}</Suspense>
      </ProductsProvider>
    );
  }

  return (
    <ProductsProvider initialServerResultsCount={initialResultsCount ?? 0}>
      <div className="flex flex-col md:grid grid-cols-12 md:gap-4">
        <Suspense fallback={null}>
          <DesktopFilters
            collections={collections}
            priceSources={priceSources}
            className="col-span-3 max-md:hidden"
            ssrPathname={ssrPathname}
            navigableShopPaths={navigableShopPaths}
          />
        </Suspense>
        <div className="col-span-9 flex flex-col max-md:pb-24">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <div className="md:hidden sticky top-top-spacing z-40 bg-transparent order-first md:order-none col-span-12">
          <div className="px-sides pt-1">
            <CompleteOrderRailDynamic showMobile />
          </div>
          <Suspense fallback={null}>
            <MobileFilters
              collections={collections}
              priceSources={priceSources}
              initialFilterCount={initialFilterCount}
              resultsCount={initialResultsCount}
              ssrPathname={ssrPathname}
              navigableShopPaths={navigableShopPaths}
            />
          </Suspense>
        </div>
      </div>
    </ProductsProvider>
  );
}
