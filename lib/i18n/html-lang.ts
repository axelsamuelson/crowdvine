import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";

/** `en` for English shop paths, `sv` for Swedish and unpaired routes. */
export function htmlLangForPath(pathname: string | null | undefined): "sv" | "en" {
  const path = pathname && pathname.length > 0 ? pathname : "/";
  return localeFromShopPath(path) === "en" ? "en" : "sv";
}

/**
 * Next's render route is the page file path (`/wine`, `/product/[handle]`),
 * sometimes with a route group. Public locale follows the same prefixes as
 * `localeFromShopPath`.
 */
export function pathnameFromRenderRoute(route: string | null | undefined): string {
  if (!route) return "/";
  let path = route.startsWith("/") ? route : `/${route}`;
  path = path.replace(/\/\([^)/]+\)/g, "");
  path = path.replace(/\/page$/, "") || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}
