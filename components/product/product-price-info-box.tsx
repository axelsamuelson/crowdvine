"use client";

import { PriceBreakdown } from "./price-breakdown";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { useMembership } from "@/lib/context/membership-context";
import { Product } from "@/lib/shopify/types";
import { useCartSource } from "@/components/cart/cart-source-context";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

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
  const isB2B = useB2BPriceMode();
  const breakdown = useProductPrice(product, selectedSource);

  const hasMemberDiscount = !loading && discountPercentage > 0;

  // No breakdown data: don't render the box (price is already in the first box)
  if (!product.priceBreakdown || !breakdown) {
    return null;
  }

  // On B2C sites (pactwines.com): breakdown.total is inkl. moms, show as is
  // On B2B sites (dirtywine.se): 
  //   - For producer source: breakdown.total is inkl. moms (B2C), convert to exkl. moms
  //   - For warehouse source: breakdown.total is already exkl. moms (B2B)
  const displayTotal = isB2B && selectedSource === "producer"
    ? breakdown.total / 1.25 // Convert from inkl. moms to exkl. moms
    : breakdown.total; // B2C: inkl. moms, B2B warehouse: exkl. moms

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
