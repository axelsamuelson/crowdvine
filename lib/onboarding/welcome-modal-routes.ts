/**
 * Route gates for WelcomeModal mount (Camille): never over PDP / cart / checkout;
 * only auto-show on the start page or wine list (/vin|/wine).
 */

/** Normalize pathname (strip trailing slash except root). */
export function normalizeWelcomePathname(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** Start page: `/` (SV) or `/en` (EN). */
export function isWelcomeStartPath(pathname: string | null | undefined): boolean {
  const p = normalizeWelcomePathname(pathname);
  return p === "/" || p === "/en";
}

/** Wine list PLP only — not category/producer subpaths. */
export function isWelcomeWineListPath(
  pathname: string | null | undefined,
): boolean {
  const p = normalizeWelcomePathname(pathname);
  return p === "/vin" || p === "/wine";
}

/** Paths where the modal may auto-open. */
export function isWelcomeModalAllowedPath(
  pathname: string | null | undefined,
): boolean {
  return isWelcomeStartPath(pathname) || isWelcomeWineListPath(pathname);
}

/** PDP product detail pages. */
export function isWelcomePdpPath(pathname: string | null | undefined): boolean {
  const p = normalizeWelcomePathname(pathname);
  return (
    p.startsWith("/product/") ||
    p.startsWith("/produkt/") ||
    p.startsWith("/en/product/") ||
    p.startsWith("/en/produkt/")
  );
}

/** Checkout (and payment) routes. */
export function isWelcomeCheckoutPath(
  pathname: string | null | undefined,
): boolean {
  const p = normalizeWelcomePathname(pathname);
  return (
    p === "/checkout" ||
    p.startsWith("/checkout/") ||
    p === "/en/checkout" ||
    p.startsWith("/en/checkout/") ||
    p === "/payment" ||
    p.startsWith("/payment/") ||
    p === "/en/payment" ||
    p.startsWith("/en/payment/")
  );
}

/** Dedicated cart routes if present (drawer cart is separate). */
export function isWelcomeCartPath(pathname: string | null | undefined): boolean {
  const p = normalizeWelcomePathname(pathname);
  return (
    p === "/cart" ||
    p.startsWith("/cart/") ||
    p === "/en/cart" ||
    p.startsWith("/en/cart/") ||
    p === "/varukorg" ||
    p.startsWith("/varukorg/")
  );
}

/** Blocked surfaces — never mount over these; wait for allowlisted path. */
export function isWelcomeModalBlockedPath(
  pathname: string | null | undefined,
): boolean {
  return (
    isWelcomePdpPath(pathname) ||
    isWelcomeCheckoutPath(pathname) ||
    isWelcomeCartPath(pathname)
  );
}
