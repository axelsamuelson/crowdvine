"use client";

import { ProductPriceDisplay } from "@/app/product/[handle]/components/product-price-display";
import type { Product } from "@/lib/shopify/types";

interface ProductHeroPriceProps {
  product: Product;
  className?: string;
}

export function ProductHeroPrice({ product, className }: ProductHeroPriceProps) {
  return (
    <ProductPriceDisplay
      product={product}
      className={className}
      showMembershipBadge={false}
    />
  );
}
