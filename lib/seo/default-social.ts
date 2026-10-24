import type { Metadata } from "next";

import type { AppLocale } from "@/lib/i18n/locale";

/** Default social preview (1200×630) used site-wide when a page has no custom image. */
export const DEFAULT_OG_IMAGE_URL = "https://pactwines.com/pact-og-uploaded.jpg";

export type DefaultOgOptions = {
  siteName?: string;
  locale?: AppLocale;
};

export function defaultOgImageAlt(options?: DefaultOgOptions): string {
  const locale = options?.locale ?? "sv";
  const siteName = options?.siteName?.trim() ?? "";
  const isDirtyWine = /^dirty wine$/i.test(siteName);
  const phrase =
    locale === "en" ? "Natural wine online" : "Naturvin online";
  if (isDirtyWine && siteName) {
    return `${siteName} — ${phrase}`;
  }
  return phrase;
}

export function defaultOgImage(options?: DefaultOgOptions) {
  return {
    url: DEFAULT_OG_IMAGE_URL,
    width: 1200,
    height: 630,
    alt: defaultOgImageAlt(options),
  } as const;
}

/** @deprecated Prefer defaultOgImage({ siteName, locale }) — kept for callers that need a const. */
export const DEFAULT_OG_IMAGE = {
  url: DEFAULT_OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: "Naturvin online",
} as const;

export function defaultOpenGraphImages(
  options?: DefaultOgOptions,
): NonNullable<Metadata["openGraph"]>["images"] {
  return [defaultOgImage(options)];
}

/** Root Twitter card — child pages inherit unless they override images. */
export function buildRootTwitterMetadata(
  siteName: string,
  twitterHandle?: string,
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: siteName,
    images: [DEFAULT_OG_IMAGE_URL],
    ...(twitterHandle
      ? { site: twitterHandle.startsWith("@") ? twitterHandle : `@${twitterHandle}` }
      : {}),
  };
}

export function pageTwitterCard(
  title: string,
  description: string,
  imageUrl: string = DEFAULT_OG_IMAGE_URL,
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title,
    description,
    images: [imageUrl],
  };
}
