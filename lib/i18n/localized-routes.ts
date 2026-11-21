import type { AppLocale } from "@/lib/i18n/locale";
import { getProducerHandle } from "@/lib/producer-handle";

/** Canonical public origin for hreflang and sitemap (pactwines.com). */
export const PACT_PUBLIC_ORIGIN = "https://pactwines.com" as const;

export type ProductPathSegment = "product" | "produkt";
/** Public profile paths — EN under /producers, SV under /producenter. */
export type ProducerPathSegment = "producers" | "producenter";

/** Portal-only segments under /producer — not public profile slugs. */
export const PRODUCER_PORTAL_SEGMENTS = new Set([
  "wines",
  "labels",
  "profile",
  "settings",
  "orders",
  "pallets",
  "signup",
]);

export function productPagePath(
  handle: string,
  segment: ProductPathSegment,
): string {
  return `/${segment}/${handle}`;
}

export function producerPagePath(
  slug: string,
  segment: ProducerPathSegment,
): string {
  return `/${segment}/${slug}`;
}

export function productPageUrls(handle: string): {
  en: string;
  sv: string;
  xDefault: string;
} {
  return {
    en: `${PACT_PUBLIC_ORIGIN}${productPagePath(handle, "product")}`,
    sv: `${PACT_PUBLIC_ORIGIN}${productPagePath(handle, "produkt")}`,
    xDefault: `${PACT_PUBLIC_ORIGIN}${productPagePath(handle, "product")}`,
  };
}

export function producerPageUrls(slug: string): {
  en: string;
  sv: string;
  xDefault: string;
} {
  return {
    en: `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, "producers")}`,
    sv: `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, "producenter")}`,
    xDefault: `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, "producers")}`,
  };
}

export function switchProductOrProducerPath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  const productMatch = pathname.match(/^\/(product|produkt)\/([^/?#]+)\/?$/);
  if (productMatch) {
    const handle = decodeURIComponent(productMatch[2]);
    return productPagePath(handle, newLocale === "sv" ? "produkt" : "product");
  }

  const producerMatch = pathname.match(
    /^\/(producers|producer|producenter|producent)\/([^/?#]+)\/?$/,
  );
  if (producerMatch) {
    const slug = decodeURIComponent(producerMatch[2]);
    if (PRODUCER_PORTAL_SEGMENTS.has(slug)) return null;
    return producerPagePath(
      slug,
      newLocale === "sv" ? "producenter" : "producers",
    );
  }

  return null;
}

export function shopPathForLocale(locale: AppLocale): "/vin" | "/wine" {
  return locale === "sv" ? "/vin" : "/wine";
}

/** Public homepage path for a locale (`/` Swedish, `/en` English). */
export function homePathForLocale(locale: AppLocale): "/" | "/en" {
  return locale === "sv" ? "/" : "/en";
}

export function producerPublicPath(slug: string, locale: AppLocale): string {
  return producerPagePath(slug, locale === "sv" ? "producenter" : "producers");
}

/**
 * Public producer profile href from legal `producers.name` only.
 * Do not pass `display_name` — that yields 404s when the short name differs.
 */
export function producerPublicHrefFromLegalName(
  legalProducerName: string,
  locale: AppLocale,
): string {
  return producerPublicPath(getProducerHandle(legalProducerName), locale);
}

/** Fact-box / byline link when the legal-name slug is already known. */
export function producerPublicHrefFromSlug(
  producerSlug: string | null | undefined,
  locale: AppLocale,
): string | null {
  const slug = producerSlug?.trim();
  if (!slug) return null;
  return producerPublicPath(slug, locale);
}

/** Producer-filtered shop PLP — /vin/{handle} or /wine/{handle}. */
export function producerShopPathFromName(
  producerName: string,
  locale: AppLocale,
): string {
  return `${shopPathForLocale(locale)}/${getProducerHandle(producerName)}`;
}

export function productPublicPath(handle: string, locale: AppLocale): string {
  return productPagePath(handle, locale === "sv" ? "produkt" : "product");
}
