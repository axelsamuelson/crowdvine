"use client";

import { ProductPriceDisplay } from "@/app/product/[handle]/components/product-price-display";
import { PriceViewTracker } from "@/components/analytics/price-view-tracker";
import { getProductListPriceSek } from "@/lib/price-breakdown";
import type { Product } from "@/lib/shopify/types";

interface ProductHeroPriceProps {
  product: Product;
  className?: string;
}

export function ProductHeroPrice({ product, className }: ProductHeroPriceProps) {
  const listPriceSek = getProductListPriceSek(product);
  return (
    <PriceViewTracker
      productId={product.id}
      productName={product.title}
      source="product"
      listPrice={
        listPriceSek ??
        (Number(product.priceRange.minVariantPrice.amount) || undefined)
      }
      currency={product.priceRange.minVariantPrice.currencyCode}
    >
      <ProductPriceDisplay
        product={product}
        className={className}
        showMembershipBadge={false}
      />
    </PriceViewTracker>
  );
}
