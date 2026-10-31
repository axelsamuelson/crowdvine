"use client";

import { memo } from "react";
import Image from "next/image";

import {
  featuredImageForProduct,
  PLP_IMAGE_QUALITY,
} from "@/lib/shop/plp-image";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import type { Product } from "@/lib/shopify/types";

interface ProductListImageProps {
  product: Product;
  priority?: boolean;
  index?: number;
}

/** Lightweight PLP image — square frame, object-cover (shop labels are 1:1). */
export const ProductListImage = memo(function ProductListImage({
  product,
  priority = false,
  index = 0,
}: ProductListImageProps) {
  const imageToShow = featuredImageForProduct(product);
  const imageUrl = imageToShow?.url || DEFAULT_WINE_IMAGE_PATH;
  const isAboveFold = priority || index < 4;

  return (
    <div className="block size-full overflow-clip [&_img]:block">
      <Image
        src={imageUrl}
        alt={imageToShow?.altText || product.title}
        width={imageToShow?.width || 600}
        height={imageToShow?.height || 600}
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
        className="size-full block object-cover object-center"
        quality={PLP_IMAGE_QUALITY}
        priority={isAboveFold}
        loading={isAboveFold ? "eager" : "lazy"}
        fetchPriority={index < 2 ? "high" : isAboveFold ? "auto" : "low"}
        placeholder={imageToShow?.thumbhash ? "blur" : undefined}
        blurDataURL={imageToShow?.thumbhash}
      />
    </div>
  );
});
