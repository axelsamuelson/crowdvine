import type { AppLocale } from "@/lib/i18n/locale";
import { getProducerHandle } from "@/lib/producer-handle";

/** Canonical public origin for hreflang and sitemap (pactwines.com). */
export const PACT_PUBLIC_ORIGIN = "https://pactwines.com" as const;

export type ProductPathSegment = "product" | "produkt";
export type ProducerPathSegment = "producer" | "producent";

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
    en: `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, "producer")}`,
    sv: `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, "producent")}`,
    xDefault: `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, "producer")}`,
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

  const producerMatch = pathname.match(/^\/(producer|producent)\/([^/?#]+)\/?$/);
  if (producerMatch) {
    const slug = decodeURIComponent(producerMatch[2]);
    return producerPagePath(slug, newLocale === "sv" ? "producent" : "producer");
  }

  return null;
}

export function shopPathForLocale(locale: AppLocale): "/vin" | "/wine" {
  return locale === "sv" ? "/vin" : "/wine";
}

export function producerPublicPath(slug: string, locale: AppLocale): string {
  return producerPagePath(slug, locale === "sv" ? "producent" : "producer");
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
