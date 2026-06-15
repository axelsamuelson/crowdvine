/** Paths that do not require login (aligned with middleware PUBLIC list). */
const PUBLIC_PATH_PREFIXES = [
  "/",
  "/log-in",
  "/signup",
  "/invite-signup",
  "/code-signup",
  "/access-request",
  "/access-pending",
  "/shop",
  "/vin",
  "/wine",
  "/product",
  "/produkt",
  "/producer",
  "/producent",
  "/producers",
  "/about",
  "/languedoc",
  "/how-it-works",
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
  "/auth/auth-code-error",
  "/forgot-password",
  "/tasting",
  "/taste-quiz",
  "/dev",
] as const;

export function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
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
