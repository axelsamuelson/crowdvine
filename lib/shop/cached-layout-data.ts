import { unstable_cache } from "next/cache";

import { fetchCollectionsData } from "@/lib/crowdvine/collections-data";
import { listPriceSources } from "@/lib/external-prices/db";

export const getCachedShopCollections = unstable_cache(
  () => fetchCollectionsData(),
  ["shop-collections"],
  { revalidate: 300 },
);

export const getCachedPriceSources = unstable_cache(
  () => listPriceSources(true),
  ["shop-price-sources"],
  { revalidate: 300 },
);
