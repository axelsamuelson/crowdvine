"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/shopify/types";
import Image from "next/image";

interface ProductImageProps {
  product: Product;
  priority?: boolean;
  index?: number;
}

export const ProductImage = memo(({ product, priority = false, index = 0 }: ProductImageProps) => {
  const selectedVariant = useSelectedVariant(product);
  const [isInView, setIsInView] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority || index < 6); // Load first 6 images immediately
  const imgRef = useRef<HTMLDivElement>(null);

  const [variantImage] = useProductImages(
    product,
    selectedVariant?.selectedOptions,
  );

  // If no variant image is available, use featured image or first image
  const imageToShow =
    variantImage ||
    product.featuredImage ||
    (product.images && product.images.length > 0 ? product.images[0] : null);

  // Intersection Observer for lazy loading and preloading
  useEffect(() => {
    if (shouldLoad || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setShouldLoad(true);
            // Preload the image
            if (imageToShow?.url) {
              const link = document.createElement("link");
              link.rel = "preload";
              link.as = "image";
              link.href = imageToShow.url;
              document.head.appendChild(link);
            }
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad, imageToShow?.url]);

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

  // Don't render image until it should load (unless priority)
  if (!shouldLoad && !priority) {
    return (
      <div ref={imgRef} className="size-full bg-muted flex items-center justify-center">
        <div className="animate-pulse bg-gray-200 size-full" />
      </div>
    );
  }

  return (
    <div ref={imgRef} className="block size-full overflow-clip [&_img]:block">
      <Image
        src={imageToShow.url}
        alt={imageToShow.altText || product.title}
        width={imageToShow.width || 600}
        height={imageToShow.height || 600}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover size-full block"
        quality={85}
        loading={priority || index < 6 ? "eager" : "lazy"}
        fetchPriority={priority || index < 3 ? "high" : "auto"}
        placeholder={imageToShow?.thumbhash ? "blur" : undefined}
        blurDataURL={imageToShow?.thumbhash}
        unoptimized={false}
      />
    </div>
  );
});
