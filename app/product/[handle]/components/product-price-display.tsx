"use client";

import { MemberPrice } from "@/components/ui/member-price";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { Product } from "@/lib/shopify/types";
import { formatPrice } from "@/lib/shopify/utils";
import { useCartSource } from "@/components/cart/cart-source-context";

interface ProductPriceDisplayProps {
  product: Product;
  className?: string;
}

/**
 * Displays product price using the same calculation as price breakdown
 * to ensure consistency between the price shown in the first white box
 * and the total price in the breakdown.
 * Price updates based on selected source: producer = B2C (inkl. moms), warehouse = B2B (exkl. moms)
 */
export function ProductPriceDisplay({ product, className }: ProductPriceDisplayProps) {
  const { selectedSource } = useCartSource();
  const breakdown = useProductPrice(product, selectedSource);

  // If we have breakdown, use its total price for consistency
  // Both producer and warehouse show exkl. moms
  // Producer uses B2C price breakdown (which includes VAT), so we need to convert to exkl. moms
  // Warehouse uses B2B price breakdown (which is already exkl. moms)
  if (breakdown) {
    // Both producer (B2C) and warehouse (B2B) show exkl. moms
    const showExclVat = true;
    
    // For producer, breakdown.total includes VAT, so convert to exkl. moms
    // For warehouse, breakdown.total is already exkl. moms
    const priceExclVat = selectedSource === "producer"
      ? breakdown.total / 1.25 // Convert from inkl. moms to exkl. moms
      : breakdown.total;
    
    return (
      <MemberPrice
        amount={product.priceRange.minVariantPrice.amount}
        currencyCode={product.priceRange.minVariantPrice.currencyCode}
        className={className}
        showBadge={true}
        priceExclVatOverride={priceExclVat}
        b2bMarginPercentage={product.priceBreakdown?.b2bMarginPercentage}
        calculatedTotalPrice={priceExclVat}
        forceShowExclVat={showExclVat}
      />
    );
  }

  // Fallback to regular MemberPrice if no breakdown
  return (
    <MemberPrice
      amount={product.priceRange.minVariantPrice.amount}
      currencyCode={product.priceRange.minVariantPrice.currencyCode}
      className={className}
      showBadge={true}
      priceExclVatOverride={
        product.priceBreakdown?.b2bPriceExclVat ??
        (product as any).b2bPriceExclVat
      }
      b2bMarginPercentage={product.priceBreakdown?.b2bMarginPercentage}
    />
  );
}
