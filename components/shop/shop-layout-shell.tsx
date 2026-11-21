import { PageLayoutServer } from "@/components/layout/page-layout-server";
import {
  getCachedPriceSources,
  getCachedShopCollections,
} from "@/lib/shop/cached-layout-data";
import { getCachedNavigableShopFilterPaths } from "@/lib/shop/shop-filter-category-availability";
import { getLiveWineRegionCountsMap } from "@/lib/wine-region-live-counts";
import { getLinkableWineRegions } from "@/lib/wine-regions";
import { ShopLayoutClient } from "@/components/shop/shop-layout-client";

/**
 * Shop chrome without headers()/cookies() so /vin and /wine stay ISR-eligible.
 * Pathname-dependent filter counts hydrate client-side; navigable paths +
 * region slugs stay server-fetched for B2C so style/color/region filters match
 * the live catalog on first paint.
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

  const [navigableShopPaths, linkableRegionSlugs] = await Promise.all([
    getCachedNavigableShopFilterPaths(false).catch((error) => {
      console.warn("Failed to resolve navigable shop filter paths:", error);
      return undefined;
    }),
    getLiveWineRegionCountsMap()
      .then((counts) =>
        getLinkableWineRegions(counts).map((region) => region.slug),
      )
      .catch((error) => {
        console.warn("Failed to resolve linkable wine regions:", error);
        return undefined;
      }),
  ]);

  return (
    <PageLayoutServer>
      <ShopLayoutClient
        collections={collections}
        priceSources={priceSources}
        initialFilterCount={0}
        initialResultsCount={null}
        ssrPathname=""
        navigableShopPaths={navigableShopPaths}
        linkableRegionSlugs={linkableRegionSlugs}
      >
        {children}
      </ShopLayoutClient>
    </PageLayoutServer>
  );
}
