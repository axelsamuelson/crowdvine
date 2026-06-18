"use client";

import { Suspense, type ReactNode } from "react";

import { CompleteOrderRail } from "@/components/cart/complete-order-rail";
import { DesktopFilters } from "@/app/vin/components/shop-filters";
import { MobileFilters } from "@/app/vin/components/mobile-filters";
import type { Collection } from "@/lib/shopify/types";
import type { PriceSourceForFilter } from "@/app/vin/components/competitor-filter";
import { ProductsProvider } from "@/components/shop/products-provider";

export function ShopLayoutClient({
  children,
  collections,
  priceSources,
  initialFilterCount = 0,
}: {
  children: ReactNode;
  collections: Collection[];
  priceSources: PriceSourceForFilter[];
  initialFilterCount?: number;
}) {
  return (
    <ProductsProvider>
      <div className="flex flex-col md:grid grid-cols-12 md:gap-4">
        <Suspense fallback={null}>
          <DesktopFilters
            collections={collections}
            priceSources={priceSources}
            className="col-span-3 max-md:hidden"
          />
        </Suspense>
        <div className="col-span-9 flex flex-col">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <div className="md:hidden sticky top-top-spacing z-40 bg-transparent order-first md:order-none col-span-12">
          <div className="px-sides pt-1">
            <CompleteOrderRail showMobile />
          </div>
          <Suspense fallback={null}>
            <MobileFilters
              collections={collections}
              priceSources={priceSources}
              initialFilterCount={initialFilterCount}
            />
          </Suspense>
        </div>
      </div>
    </ProductsProvider>
  );
}
