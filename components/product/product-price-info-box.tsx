"use client";

import { useState, useEffect } from "react";
import { PriceBreakdown } from "./price-breakdown";
import {
  calculatePriceBreakdown,
  PriceBreakdownResult,
} from "@/lib/price-breakdown";
import { useMembership } from "@/lib/context/membership-context";
import { Product } from "@/lib/shopify/types";

interface ProductPriceInfoBoxProps {
  product: Product;
}

/**
 * White box placed under grape varieties / color on the product page.
 * Shows price and full breakdown (when priceBreakdown exists). Matches design of other white boxes.
 */
export function ProductPriceInfoBox({ product }: ProductPriceInfoBoxProps) {
  const { discountPercentage, loading } = useMembership();
  const [breakdown, setBreakdown] = useState<PriceBreakdownResult | null>(null);

  useEffect(() => {
    if (!product.priceBreakdown) return;
    try {
      const result = calculatePriceBreakdown(
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
      setBreakdown(result);
    } catch (e) {
      console.error("Failed to calculate price breakdown:", e);
    }
  }, [
    product.priceBreakdown,
    product.priceRange.minVariantPrice.amount,
    discountPercentage,
    loading,
  ]);

  const hasMemberDiscount = !loading && discountPercentage > 0;

  // No breakdown data: don't render the box (price is already in the first box)
  if (!product.priceBreakdown || !breakdown) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 overflow-hidden px-3 py-2 rounded-md bg-popover md:gap-x-4 md:gap-y-4">
      <h2 className="text-lg font-semibold text-foreground lg:text-xl 2xl:text-2xl shrink-0">
        Price information
      </h2>
      <PriceBreakdown
        costAmount={breakdown.cost}
        alcoholTax={breakdown.alcoholTax}
        margin={breakdown.margin}
        vat={breakdown.vat}
        totalPrice={Number(product.priceRange.minVariantPrice.amount)}
        marginPercentage={breakdown.marginPercentage}
        originalMarginPercentage={breakdown.originalMarginPercentage}
        hasMemberDiscount={hasMemberDiscount}
        memberDiscountPercent={discountPercentage}
        variant="inline"
      />
    </div>
  );
}
