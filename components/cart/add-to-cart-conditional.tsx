"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Product } from "@/lib/shopify/types";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

const AddToCartCase = dynamic(
  () => import("./AddToCartCase").then((m) => m.AddToCartCase),
  {
    loading: () => (
      <div className="h-12 w-full animate-pulse rounded-md bg-muted" aria-hidden />
    ),
  },
);

const AddToCartWithSource = dynamic(
  () =>
    import("./add-to-cart-with-source").then((m) => m.AddToCartWithSource),
  {
    loading: () => (
      <div className="h-12 w-full animate-pulse rounded-md bg-muted" aria-hidden />
    ),
  },
);

interface AddToCartConditionalProps {
  product: Product;
  className?: string;
  /** Renders live UI but blocks cart mutations (dev PDP preview). */
  previewDisabled?: boolean;
  /** Rendered beside the B2C Add case CTA. */
  ctaAside?: ReactNode;
}

/**
 * Conditionally renders AddToCartWithSource (B2B) or AddToCartCase (B2C)
 * based on whether we're on dirtywine.se (B2B) or pactwines.com (B2C).
 * Both CTAs pull motion/react — deferred so PDP hydration stays lighter.
 */
export function AddToCartConditional({
  product,
  className,
  previewDisabled = false,
  ctaAside,
}: AddToCartConditionalProps) {
  const isB2B = useB2BPriceMode();

  if (isB2B) {
    return (
      <AddToCartWithSource
        product={product}
        className={className}
        previewDisabled={previewDisabled}
      />
    );
  }

  return (
    <AddToCartCase
      product={product}
      className={className}
      previewDisabled={previewDisabled}
      ctaAside={ctaAside}
      analyticsSource="product"
    />
  );
}
