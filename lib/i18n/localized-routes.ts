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
