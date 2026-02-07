"use client";

import { memo } from "react";
import { Product } from "@/lib/shopify/types";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const SimpleProductImage = memo(
  ({
    product,
    className,
  }: {
    product: Product;
    className?: string;
  }) => {
    const image =
      product.featuredImage ||
      (product.images?.[0] ?? null);

    if (!image?.url) {
      return (
        <div
          className={cn(
            "size-full bg-muted flex items-center justify-center",
            className,
          )}
        >
          <span className="text-muted-foreground text-sm">No image</span>
        </div>
      );
    }

    return (
      <Image
        src={image.url}
        alt={image.altText || product.title}
        width={image.width || 600}
        height={image.height || 600}
        sizes="(max-width: 768px) 100vw, 50vw"
        className={cn("object-cover size-full", className)}
        quality={85}
        loading="lazy"
      />
    );
  },
);

SimpleProductImage.displayName = "SimpleProductImage";
