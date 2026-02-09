"use client";

import { PriceBreakdown } from "./price-breakdown";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { useMembership } from "@/lib/context/membership-context";
import { Product } from "@/lib/shopify/types";
import { useCartSource } from "@/components/cart/cart-source-context";

interface ProductPriceInfoBoxProps {
  product: Product;
}

/**
 * White box placed under grape varieties / color on the product page.
 * Shows price and full breakdown (when priceBreakdown exists). Matches design of other white boxes.
 */
export function ProductPriceInfoBox({ product }: ProductPriceInfoBoxProps) {
  const { discountPercentage, loading } = useMembership();
  const { selectedSource } = useCartSource();
  const breakdown = useProductPrice(product, selectedSource);

  const hasMemberDiscount = !loading && discountPercentage > 0;

  // No breakdown data: don't render the box (price is already in the first box)
  if (!product.priceBreakdown || !breakdown) {
    return null;
  }

  // For producer, breakdown.total includes VAT, so convert to exkl. moms for display
  // For warehouse, breakdown.total is already exkl. moms
  const displayTotal = selectedSource === "producer"
    ? breakdown.total / 1.25 // Convert from inkl. moms to exkl. moms
    : breakdown.total;

  return (
    <div className="flex flex-col gap-4 overflow-clip px-3 py-2 rounded-md bg-popover md:gap-x-4 md:gap-y-4">
      <h2 className="text-lg font-semibold text-foreground lg:text-xl 2xl:text-2xl shrink-0">
        Price breakdown
      </h2>
      <PriceBreakdown
        costAmount={breakdown.cost}
        alcoholTax={breakdown.alcoholTax}
        shipping={breakdown.shipping}
        margin={breakdown.margin}
        vat={breakdown.vat}
        totalPrice={displayTotal}
        marginPercentage={breakdown.marginPercentage}
        originalMarginPercentage={breakdown.originalMarginPercentage}
        hasMemberDiscount={hasMemberDiscount}
        memberDiscountPercent={discountPercentage}
        variant="inline"
      />
    </div>
  );
}
