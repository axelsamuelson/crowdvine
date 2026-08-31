/** Paths that do not require login (aligned with middleware PUBLIC list). */
const PUBLIC_PATH_PREFIXES = [
  "/",
  "/log-in",
  "/signup",
  "/invite-signup",
  "/code-signup",
  "/access-request",
  "/access-pending",
  "/admin-auth",
  "/shop",
  "/vin",
  "/wine",
  "/product",
  "/produkt",
  "/producer",
  "/producent",
  "/producers",
  "/producenter",
  "/about",
  "/om-oss",
  // Kept so 301s in next.config reach guests before auth gates
  "/languedoc",
  "/guider",
  "/guides",
  "/how-it-works",
  "/vilkor",
  "/villkor",
  "/integritetspolicy",
  "/cookies",
  "/terms",
  "/privacy",
  "/cookie-policy",
  "/sitemap-b2b",
  "/robots-b2b",
  "/sitemap.xml",
  "/robots.txt",
  "/i",
  "/ib",
  "/b",
  "/p",
  "/c",
  "/profile",
  "/pallet",
  "/reset-password",
  "/auth/callback",
  "/auth/pkce",
  "/auth/auth-code-error",
  "/forgot-password",
  "/tasting",
  "/taste-quiz",
  "/dev",
] as const;

/**
 * Extra public prefixes when PLATFORM_OPEN=true.
 * /vin and /product are already public; /checkout is the critical addition.
 */
const PLATFORM_OPEN_PUBLIC_PREFIXES = ["/checkout"] as const;

export function isPublicAppPath(
  pathname: string,
  opts?: { platformOpen?: boolean },
): boolean {
  const prefixes = opts?.platformOpen
    ? [...PUBLIC_PATH_PREFIXES, ...PLATFORM_OPEN_PUBLIC_PREFIXES]
    : PUBLIC_PATH_PREFIXES;
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Browse + checkout paths that skip membership gate when PLATFORM_OPEN. */
export function isOpenPlatformBrowseOrCheckoutPath(pathname: string): boolean {
  const openPrefixes = [
    "/checkout",
    "/vin",
    "/wine",
    "/product",
    "/produkt",
    "/shop",
  ] as const;
  return openPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Public routes that still need the signed-in user's geo zone for correct prices. */
export function publicPathUsesUserShoppingContext(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname.startsWith("/shop/")
  ) {
    return true;
  }
  if (pathname.startsWith("/product/")) return true;
  if (pathname.startsWith("/produkt/")) return true;
  if (pathname.startsWith("/checkout")) return true;
  return false;
}
