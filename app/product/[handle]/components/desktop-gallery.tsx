"use client";

import { useRef } from "react";
import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/shopify/types";
import Image from "next/image";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

export const DesktopGallery = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);
  const zoomTracked = useRef(false);

  // If no images are available, return null
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <>
      {images.map((image, idx) => {
        // Skip images without URL
        if (!image || !image.url) {
          return null;
        }

        return (
          <Image
            style={{
              aspectRatio: `${image.width} / ${image.height}`,
            }}
            key={`${image.url}-${image.selectedOptions?.map((o, i) => `${o.name},${o.value}`).join("-") || image.id || image.url}`}
            src={image.url}
            alt={image.altText || product.title}
            width={image.width || 600}
            height={image.height || 600}
            className="w-full object-cover cursor-zoom-in"
            quality={100}
            onClick={() => {
              if (zoomTracked.current) return;
              zoomTracked.current = true;
              void AnalyticsTracker.trackEvent({
                eventType: "image_zoomed",
                eventCategory: "engagement",
                metadata: {
                  productId: product.id,
                  imageIndex: idx,
                },
              });
            }}
          />
        );
      })}
    </>
  );
};
