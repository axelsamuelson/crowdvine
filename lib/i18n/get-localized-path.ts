import { switchAboutPath } from "@/lib/i18n/about-page-content";
import type { AppLocale } from "@/lib/i18n/locale";
import { switchProducersDirectoryPath } from "@/lib/i18n/producers-directory";
import {
  homePathForLocale,
  switchProductOrProducerPath,
} from "@/lib/i18n/localized-routes";
import { switchGuidePath } from "@/lib/guides/switch-guide-path";
import {
  isProducerBoxesPath,
  producerBoxesPath,
} from "@/lib/producer-boxes/config";
import {
  getHreflangPath,
  getWineCategoryEn,
  getWineCategorySv,
} from "@/lib/wine-categories";
import { switchWineRegionPath } from "@/lib/wine-regions";

/** Locale switch for the producer-boxes landing (different SV/EN slugs). */
export function switchProducerBoxesPath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  if (!isProducerBoxesPath(pathname)) return null;
  return producerBoxesPath(newLocale);
}

/**
 * Map the current path to the equivalent URL in `newLocale`.
 * Category slugs that differ between SV and EN (colour, farming, region, box)
 * use hreflang / dedicated helpers — never a blind prefix swap.
 */
export function getLocalizedPath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  if (pathname === "/" || pathname === "/en") {
    return homePathForLocale(newLocale);
  }

  const productOrProducer = switchProductOrProducerPath(pathname, newLocale);
  if (productOrProducer) return productOrProducer;

  const producerBoxes = switchProducerBoxesPath(pathname, newLocale);
  if (producerBoxes) return producerBoxes;

  const wineRegion = switchWineRegionPath(pathname, newLocale);
  if (wineRegion) return wineRegion;

  const about = switchAboutPath(pathname, newLocale);
  if (about) return about;

  const producersDirectory = switchProducersDirectoryPath(pathname, newLocale);
  if (producersDirectory) return producersDirectory;

  const guide = switchGuidePath(pathname, newLocale);
  if (guide) return guide;

  // Checkout + profile language pairs (middleware rewrites /en/… → shared tree).
  if (
    (pathname === "/checkout" ||
      pathname.startsWith("/checkout/") ||
      pathname === "/profile" ||
      pathname.startsWith("/profile/")) &&
    newLocale === "en"
  ) {
    return `/en${pathname}`;
  }
  if (
    (pathname === "/en/checkout" ||
      pathname.startsWith("/en/checkout/") ||
      pathname === "/en/profile" ||
      pathname.startsWith("/en/profile/")) &&
    newLocale === "sv"
  ) {
    return pathname.replace(/^\/en/, "") || "/";
  }

  // /vin → /wine och vice versa
  if (pathname === "/vin" && newLocale === "en") return "/wine";
  if (pathname === "/wine" && newLocale === "sv") return "/vin";

  // /vin/[kategori] → /wine/[category]
  if (pathname.startsWith("/vin/") && newLocale === "en") {
    const slug = pathname.slice("/vin/".length).split("/")[0];
    if (!slug) return null;
    const category = getWineCategorySv(slug);
    if (category) return getHreflangPath(category);
    // producer/collection slug — byt bara prefix
    return `/wine/${slug}`;
  }

  // /wine/[category] → /vin/[kategori]
  if (pathname.startsWith("/wine/") && newLocale === "sv") {
    const slug = pathname.slice("/wine/".length).split("/")[0];
    if (!slug) return null;
    const category = getWineCategoryEn(slug);
    if (category) return getHreflangPath(category);
    // producer/collection slug — byt bara prefix
    return `/vin/${slug}`;
  }

  return null;
}
