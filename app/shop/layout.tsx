import { DesktopFilters } from "./components/shop-filters";
import { Suspense } from "react";
import { getCollections } from "@/lib/shopify";
import { PageLayout } from "@/components/layout/page-layout";
import { MobileFilters } from "./components/mobile-filters";
import { ProductsProvider } from "./providers/products-provider";
import { CompleteOrderRail } from "@/components/cart/complete-order-rail";
import { listPriceSources } from "@/lib/external-prices/db";

// Enable ISR with 1 minute revalidation for the layout
export const revalidate = 60;

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let collections = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn("Failed to fetch collections in shop layout:", error);
    collections = [];
  }

  let priceSources: { id: string; name: string; slug: string }[] = [];
  try {
    const sources = await listPriceSources(true);
    priceSources = sources.map((s) => ({ id: s.id, name: s.name, slug: s.slug }));
  } catch (error) {
    console.warn("Failed to fetch price sources in shop layout:", error);
  }

  return (
    <PageLayout>
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
    </PageLayout>
  );
}
