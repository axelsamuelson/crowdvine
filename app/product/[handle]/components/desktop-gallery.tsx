"use client";

import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/shopify/types";
import Image from "next/image";

export const DesktopGallery = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);

  // If no images are available, return null
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <>
      {images.map((image) => {
        // Skip images without URL
        if (!image || !image.url) {
          return null;
        }

        return (
          <Image
            style={{
              aspectRatio: `${image.width} / ${image.height}`,
            }}
            key={`${image.url}-${image.selectedOptions?.map((o, idx) => `${o.name},${o.value}`).join("-") || image.url}`}
            src={image.url}
            alt={image.altText || product.title}
            width={image.width || 600}
            height={image.height || 600}
            className="w-full object-cover"
            quality={100}
          />
        );
      })}
    </>
  );
};
