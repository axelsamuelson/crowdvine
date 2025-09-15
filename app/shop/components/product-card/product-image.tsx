"use client";

import { memo } from "react";
import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/shopify/types";
import Image from "next/image";

export const ProductImage = memo(({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);

  const [variantImage] = useProductImages(
    product,
    selectedVariant?.selectedOptions,
  );

  // If no variant image is available, use featured image or first image
  const imageToShow =
    variantImage ||
    product.featuredImage ||
    (product.images && product.images.length > 0 ? product.images[0] : null);

  // If no image is available at all, don't render the Image component
  if (!imageToShow || !imageToShow.url) {
    return (
      <div className="size-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">
          No image available
        </span>
      </div>
    );
  }

  return (
    <Image
      src={imageToShow.url}
      alt={imageToShow.altText || product.title}
      width={imageToShow.width || 600}
      height={imageToShow.height || 600}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover size-full"
      quality={85}
      loading="lazy"
      placeholder={imageToShow?.thumbhash ? "blur" : undefined}
      blurDataURL={imageToShow?.thumbhash}
    />
  );
});
