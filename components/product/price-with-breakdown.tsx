"use client";

import { MemberPrice } from "@/components/ui/member-price";
import { PriceBreakdown } from "./price-breakdown";
import { calculatePriceBreakdown } from "@/lib/price-breakdown";
import { useMembership } from "@/lib/context/membership-context";
import { formatPrice } from "@/lib/shopify/utils";
import { Product } from "@/lib/shopify/types";

interface PriceWithBreakdownProps {
  product: Product;
}

export function PriceWithBreakdown({ product }: PriceWithBreakdownProps) {
  const { discountPercentage, loading } = useMembership();

  // Only show breakdown if we have pricing data
  if (!product.priceBreakdown) {
    return (
      <MemberPrice
        amount={product.priceRange.minVariantPrice.amount}
        currencyCode={product.priceRange.minVariantPrice.currencyCode}
        className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
        showBadge={true}
      />
    );
  }

  // Calculate breakdown with member discount
  const breakdown = calculatePriceBreakdown(
    {
      cost_amount: product.priceBreakdown.costAmount,
      exchange_rate: product.priceBreakdown.exchangeRate,
      alcohol_tax_cents: product.priceBreakdown.alcoholTaxCents,
      margin_percentage: product.priceBreakdown.marginPercentage,
      base_price_cents: Number(product.priceRange.minVariantPrice.amount) * 100,
    },
    loading ? 0 : discountPercentage
  );

  const hasMemberDiscount = !loading && discountPercentage > 0;

  return (
    <div className="flex gap-3 items-center">
      <MemberPrice
        amount={product.priceRange.minVariantPrice.amount}
        currencyCode={product.priceRange.minVariantPrice.currencyCode}
        className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
        showBadge={true}
      />
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
      />
    </div>
  );
}
