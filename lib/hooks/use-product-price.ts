"use client";

import { useMemo, useState, useEffect } from "react";
import { useMembership } from "@/lib/context/membership-context";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import {
  calculatePriceBreakdown,
  calculateB2BPriceBreakdown,
  calculateB2BPriceWithDiscount,
  PriceBreakdownResult,
} from "@/lib/price-breakdown";
import { Product } from "@/lib/shopify/types";

/**
 * Hook to calculate product price breakdown and total price.
 * Ensures consistent pricing between MemberPrice and PriceBreakdown components.
 * @param product - Product to calculate price for
 * @param source - Cart source ("producer" = B2C price, "warehouse" = B2B price)
 */
export function useProductPrice(product: Product, source?: "producer" | "warehouse") {
  const { discountPercentage, loading } = useMembership();
  const isB2B = useB2BPriceMode();
  const [isMounted, setIsMounted] = useState(false);

  // Hydration safety: only calculate breakdown after client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const result = useMemo(() => {
    if (!product.priceBreakdown || !isMounted) {
      return null;
    }

    try {
      let breakdown: PriceBreakdownResult;
      
      // If source is "producer", always use B2C price breakdown (inkl. moms)
      // If source is "warehouse" or not specified, use B2B price breakdown on dirtywine.se
      const useB2BPrice = source === "warehouse" || (source === undefined && isB2B);
      
      if (useB2BPrice && product.priceBreakdown.b2bPriceExclVat != null && product.priceBreakdown.b2bMarginPercentage != null) {
        // Calculate B2B price with discount applied to margin
        const b2bPriceWithDiscount = loading || discountPercentage <= 0
          ? product.priceBreakdown.b2bPriceExclVat
          : calculateB2BPriceWithDiscount(
              product.priceBreakdown.b2bPriceExclVat,
              product.priceBreakdown.b2bMarginPercentage,
              discountPercentage,
            );
        
        breakdown = calculateB2BPriceBreakdown(
          b2bPriceWithDiscount,
          product.priceBreakdown.costAmount,
          product.priceBreakdown.exchangeRate,
          product.priceBreakdown.alcoholTaxCents,
          product.priceBreakdown.b2bMarginPercentage,
          loading ? 0 : discountPercentage,
          product.priceBreakdown.b2bShippingPerBottleSek ?? 0,
        );
      } else {
        // On pactwines.com (B2C), use regular price breakdown
        breakdown = calculatePriceBreakdown(
          {
            cost_amount: product.priceBreakdown.costAmount,
            exchange_rate: product.priceBreakdown.exchangeRate,
            alcohol_tax_cents: product.priceBreakdown.alcoholTaxCents,
            margin_percentage: product.priceBreakdown.marginPercentage,
            base_price_cents:
              Number(product.priceRange.minVariantPrice.amount) * 100,
          },
          loading ? 0 : discountPercentage,
        );
      }

      return breakdown;
    } catch (e) {
      console.error("Failed to calculate price breakdown:", e);
      return null;
    }
  }, [
    product.priceBreakdown,
    product.priceRange.minVariantPrice.amount,
    discountPercentage,
    loading,
    isB2B,
    isMounted,
    source,
  ]);

  return result;
}
