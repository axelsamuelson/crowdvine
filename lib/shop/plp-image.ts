import type { Product } from "@/lib/shopify/types";

export const PLP_IMAGE_QUALITY = 70;

export function featuredImageForProduct(product: Product) {
  return product.featuredImage ?? product.images?.[0] ?? null;
}

export function buildNextImagePreloadHref(src: string, width: number): string {
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(PLP_IMAGE_QUALITY),
  });
  return `/_next/image?${params.toString()}`;
}
