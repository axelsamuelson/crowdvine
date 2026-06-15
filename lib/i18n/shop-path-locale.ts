import type { AppLocale } from "@/lib/i18n/locale";

/** Locale implied by path prefix (/vin, /produkt, /product, etc.). */
export function localeFromShopPath(pathname: string): AppLocale | null {
  if (pathname === "/vin" || pathname.startsWith("/vin/")) return "sv";
  if (pathname === "/wine" || pathname.startsWith("/wine/")) return "en";
  if (pathname.startsWith("/produkt/")) return "sv";
  if (pathname.startsWith("/product/")) return "en";
  if (pathname.startsWith("/producent/")) return "sv";
  if (pathname.startsWith("/producer/")) return "en";
  return null;
}
