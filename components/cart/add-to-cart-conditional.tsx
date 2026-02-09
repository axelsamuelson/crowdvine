"use client";

import { AddToCart } from "./add-to-cart";
import { AddToCartWithSource } from "./add-to-cart-with-source";
import { Product } from "@/lib/shopify/types";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

interface AddToCartConditionalProps {
  product: Product;
  className?: string;
}

/**
 * Conditionally renders AddToCartWithSource (B2B) or AddToCart (B2C)
 * based on whether we're on dirtywine.se (B2B) or pactwines.com (B2C)
 */
export function AddToCartConditional({
  product,
  className,
}: AddToCartConditionalProps) {
  const isB2B = useB2BPriceMode();

  if (isB2B) {
    return <AddToCartWithSource product={product} className={className} />;
  }

  return <AddToCart product={product} className={className} />;
}
