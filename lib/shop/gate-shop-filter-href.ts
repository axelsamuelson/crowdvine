/** True when path may be used as a crawlable shop filter link. */
export function isNavigableShopFilterPath(
  path: string,
  navigablePaths: readonly string[] | undefined,
): boolean {
  if (!navigablePaths) return true;
  return navigablePaths.includes(path);
}

/**
 * Drop crawlable hrefs that would land on an empty category for this site.
 * Clearing an active filter keeps its URL (back to parent / root).
 * Client-safe: no server-only imports.
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
