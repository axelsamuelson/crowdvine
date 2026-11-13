/** Paths that do not require login (aligned with middleware PUBLIC list). */
const PUBLIC_PATH_PREFIXES = [
  "/",
  "/en",
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
  "/region",
  "/regions",
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
  "/b2b-pallets",
  "/b2b/inquiry",
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
  "/boxes",
] as const;

/**
 * Extra public prefixes when PLATFORM_OPEN=true or GUEST_CHECKOUT_ENABLED=true.
 * /vin and /product are already public; /checkout is the critical addition.
 */
const OPEN_CHECKOUT_PUBLIC_PREFIXES = ["/checkout", "/b2b/inquiry"] as const;

export function isPublicAppPath(
  pathname: string,
  opts?: { platformOpen?: boolean; guestCheckoutEnabled?: boolean },
): boolean {
  const openCheckout =
    Boolean(opts?.platformOpen) || Boolean(opts?.guestCheckoutEnabled);
  const prefixes = openCheckout
    ? [...PUBLIC_PATH_PREFIXES, ...OPEN_CHECKOUT_PUBLIC_PREFIXES]
    : PUBLIC_PATH_PREFIXES;
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Browse + checkout paths that skip membership gate when PLATFORM_OPEN. */
export function isOpenPlatformBrowseOrCheckoutPath(pathname: string): boolean {
  const openPrefixes = [
    "/checkout",
    "/b2b/inquiry",
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
    pathname === "/en" ||
    pathname === "/shop" ||
    pathname.startsWith("/shop/")
  ) {
    return true;
  }
  if (pathname.startsWith("/product/")) return true;
  if (pathname.startsWith("/produkt/")) return true;
  if (pathname.startsWith("/region/")) return true;
  if (pathname.startsWith("/regions/")) return true;
  if (pathname.startsWith("/checkout")) return true;
  return false;
}
