import { isNavigableShopFilterPath } from "@/lib/shop/shop-filter-category-availability";

/**
 * Drop crawlable hrefs that would land on an empty category for this site.
 * Clearing an active filter keeps its URL (back to parent / root).
 */
export function gateShopFilterHref(
  url: string | null,
  options: {
    isClear: boolean;
    navigablePaths?: readonly string[];
  },
): string | null {
  if (!url) return null;
  if (options.isClear) return url;
  if (!isNavigableShopFilterPath(url, options.navigablePaths)) return null;
  return url;
}
