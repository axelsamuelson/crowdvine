import { PageLayoutServer } from "@/components/layout/page-layout-server";
import {
  getCachedPriceSources,
  getCachedShopCollections,
} from "@/lib/shop/cached-layout-data";
import { getCachedNavigableShopFilterPaths } from "@/lib/shop/shop-filter-category-availability";
import { ShopLayoutClient } from "@/components/shop/shop-layout-client";

/**
 * Shop chrome without headers()/cookies() so /vin and /wine stay ISR-eligible.
 * Filter counts and B2B navigable paths hydrate client-side; static shell uses B2C.
 */
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

  const navigableShopPaths = await getCachedNavigableShopFilterPaths(false).catch(
    (error) => {
      console.warn("Failed to resolve navigable shop filter paths:", error);
      return undefined;
    },
  );

  return (
    <PageLayoutServer>
      <ShopLayoutClient
        collections={collections}
        priceSources={priceSources}
        initialFilterCount={0}
        ssrPathname=""
        navigableShopPaths={navigableShopPaths}
      >
        {children}
      </ShopLayoutClient>
    </PageLayoutServer>
  );
}
