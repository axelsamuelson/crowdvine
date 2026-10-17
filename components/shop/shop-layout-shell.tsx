import { PageLayoutServer } from "@/components/layout/page-layout-server";
import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import {
  getCachedPriceSources,
  getCachedShopCollections,
} from "@/lib/shop/cached-layout-data";
import {
  countActiveShopFilters,
  parseSearchParamsFromQueryString,
} from "@/lib/shop/filter-count-server";
import { isProducerBoxesPath } from "@/lib/producer-boxes/config";
import { getCachedNavigableShopFilterPaths } from "@/lib/shop/shop-filter-category-availability";
import { getShopLayoutResultsCount } from "@/lib/shop/shop-results-count-server";
import { ShopLayoutClient } from "@/components/shop/shop-layout-client";
import { headers } from "next/headers";

function collectionSegmentFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/^\/(?:vin|wine)\/([^/]+)$/);
  if (!match) return undefined;
  const segment = match[1];
  if (segment === "group") return undefined;
  return segment;
}

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

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const search = headersList.get("x-search") ?? "";
  const parsedSearchParams = parseSearchParamsFromQueryString(search);
  const collectionSegment = collectionSegmentFromPathname(pathname);
  const initialFilterCount = countActiveShopFilters(
    parsedSearchParams,
    isProducerBoxesPath(pathname) ? undefined : collectionSegment,
  );
  const isB2BSite = await getIsDirtywineSiteFromHeaders();
  const [initialResultsCount, navigableShopPaths] = await Promise.all([
    getShopLayoutResultsCount(pathname, parsedSearchParams),
    getCachedNavigableShopFilterPaths(isB2BSite).catch((error) => {
      console.warn(
        "Failed to resolve navigable shop filter paths:",
        error,
      );
      return undefined;
    }),
  ]);

  return (
    <PageLayoutServer>
      <ShopLayoutClient
        collections={collections}
        priceSources={priceSources}
        initialFilterCount={initialFilterCount}
        initialResultsCount={initialResultsCount}
        ssrPathname={pathname}
        navigableShopPaths={navigableShopPaths}
      >
        {children}
      </ShopLayoutClient>
    </PageLayoutServer>
  );
}
