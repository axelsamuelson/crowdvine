"use client";

import { useState, useEffect } from "react";
import { MemberPrice } from "@/components/ui/member-price";
import { PriceBreakdown } from "./price-breakdown";
import {
  calculatePriceBreakdown,
  PriceBreakdownResult,
} from "@/lib/price-breakdown";
import { useMembership } from "@/lib/context/membership-context";
import { formatPrice } from "@/lib/shopify/utils";
import { Product } from "@/lib/shopify/types";

interface PriceWithBreakdownProps {
  product: Product;
}

export function PriceWithBreakdown({ product }: PriceWithBreakdownProps) {
  const { discountPercentage, loading } = useMembership();
  const [breakdown, setBreakdown] = useState<PriceBreakdownResult | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Only show breakdown if we have pricing data
  if (!product.priceBreakdown) {
    return (
      <MemberPrice
        amount={product.priceRange.minVariantPrice.amount}
        currencyCode={product.priceRange.minVariantPrice.currencyCode}
        className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
        showBadge={true}
        priceExclVatOverride={(product as any).b2bPriceExclVat}
      />
    );
  }

  // Calculate breakdown when component mounts or discount changes
  useEffect(() => {
    const calculateBreakdown = () => {
      setBreakdownLoading(true);
      try {
        const result = calculatePriceBreakdown(
          {
            cost_amount: product.priceBreakdown!.costAmount,
            exchange_rate: product.priceBreakdown!.exchangeRate,
            alcohol_tax_cents: product.priceBreakdown!.alcoholTaxCents,
            margin_percentage: product.priceBreakdown!.marginPercentage,
            base_price_cents:
              Number(product.priceRange.minVariantPrice.amount) * 100,
          },
          loading ? 0 : discountPercentage,
        );
        setBreakdown(result);
      } catch (error) {
        console.error("Failed to calculate price breakdown:", error);
      } finally {
        setBreakdownLoading(false);
      }
    };

    calculateBreakdown();
  }, [
    product.priceBreakdown,
    discountPercentage,
    loading,
    product.priceRange.minVariantPrice.amount,
  ]);

  const hasMemberDiscount = !loading && discountPercentage > 0;

  return (
    <div className="flex flex-col gap-1 items-start">
      <MemberPrice
        amount={product.priceRange.minVariantPrice.amount}
        currencyCode={product.priceRange.minVariantPrice.currencyCode}
        className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
        showBadge={true}
        priceExclVatOverride={
          product.priceBreakdown?.b2bPriceExclVat ??
          (product as any).b2bPriceExclVat
        }
      />
      {breakdown && (
        <div className="mt-0.5">
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
      )}
    </div>
  );
}
