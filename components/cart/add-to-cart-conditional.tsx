"use client";

import { AddToCartCase } from "./AddToCartCase";
import { AddToCartWithSource } from "./add-to-cart-with-source";
import { Product } from "@/lib/shopify/types";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

interface AddToCartConditionalProps {
  product: Product;
  className?: string;
  /** Renders live UI but blocks cart mutations (dev PDP preview). */
  previewDisabled?: boolean;
}

/**
 * Conditionally renders AddToCartWithSource (B2B) or AddToCartCase (B2C)
 * based on whether we're on dirtywine.se (B2B) or pactwines.com (B2C)
 */
export function AddToCartConditional({
  product,
  className,
  previewDisabled = false,
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
    />
  );
}
