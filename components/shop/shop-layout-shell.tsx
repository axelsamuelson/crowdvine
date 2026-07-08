import { PageLayoutServer } from "@/components/layout/page-layout-server";
import {
  getCachedPriceSources,
  getCachedShopCollections,
} from "@/lib/shop/cached-layout-data";
import {
  countActiveShopFilters,
  parseSearchParamsFromQueryString,
} from "@/lib/shop/filter-count-server";
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
  const initialFilterCount = countActiveShopFilters(
    parsedSearchParams,
    collectionSegmentFromPathname(pathname),
  );
  const initialResultsCount = await getShopLayoutResultsCount(
    pathname,
    parsedSearchParams,
  );

  return (
    <PageLayoutServer>
      <ShopLayoutClient
        collections={collections}
        priceSources={priceSources}
        initialFilterCount={initialFilterCount}
        initialResultsCount={initialResultsCount}
      >
        {children}
      </ShopLayoutClient>
    </PageLayoutServer>
  );
}
