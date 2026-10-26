import { unstable_cache } from "next/cache";
import { getSiteContentByKey } from "@/lib/actions/content";

const FEW_LEFT_KEY = "wine_few_left_threshold";
const DEFAULT_FEW_LEFT = 5;

/** Cache tag for site-wide wine display settings (few-left threshold). */
export const WINE_SETTINGS_CACHE_TAG = "wine-settings";

async function fetchWineFewLeftThreshold(): Promise<number> {
  const val = await getSiteContentByKey(FEW_LEFT_KEY);
  if (val == null || val === "") return DEFAULT_FEW_LEFT;
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FEW_LEFT;
}

/**
 * Cached read for storefront (root layout, API).
 * Tag "wine-settings" — bust with revalidateTag on admin update.
 * revalidate: 300 is a safety TTL; tag invalidation is the primary refresh path.
 */
export const getCachedWineFewLeftThreshold = unstable_cache(
  () => fetchWineFewLeftThreshold(),
  ["wine-few-left-threshold"],
  {
    revalidate: 300,
    tags: [WINE_SETTINGS_CACHE_TAG],
  },
);
