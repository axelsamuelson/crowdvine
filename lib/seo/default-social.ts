import type { Metadata } from "next";

/** Default social preview (1200×630) used site-wide when a page has no custom image. */
export const DEFAULT_OG_IMAGE = {
  url: "https://pactwines.com/pact-og-uploaded.jpg",
  width: 1200,
  height: 630,
  alt: "PACT Wines — Naturvin direkt från Languedoc",
} as const;

export function defaultOpenGraphImages(): NonNullable<
  Metadata["openGraph"]
>["images"] {
  return [DEFAULT_OG_IMAGE];
}

/** Root Twitter card — child pages inherit unless they override images. */
export function buildRootTwitterMetadata(
  siteName: string,
  twitterHandle?: string,
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: siteName,
    images: [DEFAULT_OG_IMAGE.url],
    ...(twitterHandle
      ? { site: twitterHandle.startsWith("@") ? twitterHandle : `@${twitterHandle}` }
      : {}),
  };
}

export function pageTwitterCard(
  title: string,
  description: string,
  imageUrl: string = DEFAULT_OG_IMAGE.url,
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title,
    description,
    images: [imageUrl],
  };
}
