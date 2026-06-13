import { Suspense } from "react";

import { CompleteOrderRail } from "@/components/cart/complete-order-rail";
import { PageLayoutServer } from "@/components/layout/page-layout-server";
import {
  getCachedPriceSources,
  getCachedShopCollections,
} from "@/lib/shop/cached-layout-data";
import { DesktopFilters } from "@/app/vin/components/shop-filters";
import { MobileFilters } from "@/app/vin/components/mobile-filters";
import { ProductsProvider } from "@/app/vin/providers/products-provider";

export async function ShopLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  let collections = [];
  try {
    collections = await getCachedShopCollections();
  } catch (error) {
    console.warn("Failed to fetch collections in shop layout:", error);
    collections = [];
  }

  let priceSources: { id: string; name: string; slug: string }[] = [];
  try {
    const sources = await getCachedPriceSources();
    priceSources = sources.map((s) => ({ id: s.id, name: s.name, slug: s.slug }));
  } catch (error) {
    console.warn("Failed to fetch price sources in shop layout:", error);
  }

  return (
    <PageLayoutServer>
      <ProductsProvider>
        <div className="flex flex-col md:grid grid-cols-12 md:gap-4">
          <Suspense fallback={null}>
            <DesktopFilters
              collections={collections}
              priceSources={priceSources}
              className="col-span-3 max-md:hidden"
            />
          </Suspense>
          {/* Mobile: sticky controls under the fixed header */}
          <div className="md:hidden sticky top-top-spacing z-40 bg-transparent">
            <div className="px-sides pt-1">
              <CompleteOrderRail showMobile />
            </div>
            <Suspense fallback={null}>
              <MobileFilters collections={collections} priceSources={priceSources} />
            </Suspense>
          </div>

          <div className="col-span-9 flex flex-col">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </ProductsProvider>
    </PageLayoutServer>
  );
}
