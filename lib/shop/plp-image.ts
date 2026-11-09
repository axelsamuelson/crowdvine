import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import type { Product } from "@/lib/shopify/types";

export const PLP_IMAGE_QUALITY = 70;

export function featuredImageForProduct(product: Product) {
  return product.featuredImage ?? product.images?.[0] ?? null;
}

/** Normalize default-wine to the static relative path before preload/optimize. */
export function resolvePlpImageSrc(src: string | null | undefined): string {
  const clean = String(src ?? "").trim();
  if (!clean || /(?:^|\/)default-wine\.png$/i.test(clean)) {
    return DEFAULT_WINE_IMAGE_PATH;
  }
  return clean;
}

export function buildNextImagePreloadHref(src: string, width: number): string {
  const resolved = resolvePlpImageSrc(src);
  // Default bottle is a local static asset — preload it directly (optimizer
  // 400s on absolute vercel.app/default-wine.png URLs from prior deploys).
  if (resolved === DEFAULT_WINE_IMAGE_PATH) {
    return DEFAULT_WINE_IMAGE_PATH;
  }
  const params = new URLSearchParams({
    url: resolved,
    w: String(width),
    q: String(PLP_IMAGE_QUALITY),
  });
  return `/_next/image?${params.toString()}`;
}
