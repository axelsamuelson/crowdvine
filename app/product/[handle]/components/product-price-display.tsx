"use client";

import { MemberPrice } from "@/components/ui/member-price";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { Product } from "@/lib/shopify/types";
import { formatPrice } from "@/lib/shopify/utils";
import { useCartSource } from "@/components/cart/cart-source-context";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

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
  const isB2B = useB2BPriceMode();
  const breakdown = useProductPrice(product, selectedSource);

  // On B2C sites (pactwines.com), show price inkl. moms
  // On B2B sites (dirtywine.se), show price exkl. moms
  // If source is "producer" on B2B site, we still show exkl. moms (B2C price converted)
  // If source is "warehouse" on B2B site, show exkl. moms (B2B price)
  const showExclVat = isB2B;

  // If we have breakdown, use its total price for consistency
  if (breakdown) {
    if (isB2B) {
      // On B2B site: show exkl. moms
      // For producer source, breakdown.total includes VAT, so convert to exkl. moms
      // For warehouse source, breakdown.total is already exkl. moms
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
          forceShowExclVat={true}
        />
      );
    } else {
      // On B2C site: show inkl. moms (breakdown.total is inkl. moms for B2C)
      return (
        <MemberPrice
          amount={product.priceRange.minVariantPrice.amount}
          currencyCode={product.priceRange.minVariantPrice.currencyCode}
          className={className}
          showBadge={true}
          calculatedTotalPrice={breakdown.total}
          forceShowExclVat={false}
        />
      );
    }
  }

  // Fallback to regular MemberPrice if no breakdown
  // On B2C sites, show inkl. moms (no override)
  // On B2B sites, show exkl. moms (with override)
  return (
    <MemberPrice
      amount={product.priceRange.minVariantPrice.amount}
      currencyCode={product.priceRange.minVariantPrice.currencyCode}
      className={className}
      showBadge={true}
      priceExclVatOverride={
        isB2B
          ? (product.priceBreakdown?.b2bPriceExclVat ??
             (product as any).b2bPriceExclVat)
          : undefined
      }
      b2bMarginPercentage={product.priceBreakdown?.b2bMarginPercentage}
      forceShowExclVat={isB2B}
    />
  );
}
