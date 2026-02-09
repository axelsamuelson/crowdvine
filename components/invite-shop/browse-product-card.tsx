"use client";

import React, { memo } from "react";
import Link from "next/link";
import { Product } from "@/lib/shopify/types";
import { formatPrice, priceExclVat } from "@/lib/shopify/utils";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { SimpleProductImage } from "./simple-product-image";
import { Badge } from "@/components/ui/badge";
import { MemberPrice } from "@/components/ui/member-price";
import { StockBadge } from "@/components/product/stock-badge";
import { ArrowRightIcon } from "lucide-react";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { calculatePriceBreakdown, calculateB2BPriceBreakdown } from "@/lib/price-breakdown";
import { useMembership } from "@/lib/context/membership-context";
import { useMemo } from "react";

interface BrowseProductCardProps {
  product: Product;
  inviteBasePath: string;
  /** When provided, opens product in modal instead of navigating */
  onProductClick?: (handle: string) => void;
}

export const BrowseProductCard = memo(
  ({
    product,
    inviteBasePath,
    onProductClick,
  }: BrowseProductCardProps) => {
    const showExclVat = useB2BPriceMode();
    const isWineBox = product.productType === "wine-box";
    const discountInfo = (product as any).discountInfo;
    const { discountPercentage, loading: membershipLoading } = useMembership();
    
    // Get both producer and warehouse prices for B2B sites
    const producerBreakdown = useProductPrice(product, "producer");
    const warehouseBreakdown = useProductPrice(product, "warehouse");
    
    // Fallback: Calculate prices directly if hooks return null but we have priceBreakdown
    const fallbackProducerPrice = useMemo(() => {
      if (producerBreakdown || !product.priceBreakdown || !product.priceRange?.minVariantPrice) {
        return null;
      }
      try {
        const breakdown = calculatePriceBreakdown(
          {
            cost_amount: product.priceBreakdown.costAmount,
            exchange_rate: product.priceBreakdown.exchangeRate,
            alcohol_tax_cents: product.priceBreakdown.alcoholTaxCents,
            margin_percentage: product.priceBreakdown.marginPercentage,
            base_price_cents: Number(product.priceRange.minVariantPrice.amount) * 100,
          },
          membershipLoading ? 0 : discountPercentage,
        );
        return breakdown.total / 1.25; // Convert to exkl. moms
      } catch {
        return null;
      }
    }, [producerBreakdown, product.priceBreakdown, product.priceRange?.minVariantPrice, discountPercentage, membershipLoading]);
    
    const fallbackWarehousePrice = useMemo(() => {
      if (warehouseBreakdown || !product.priceBreakdown?.b2bPriceExclVat || !product.priceBreakdown?.b2bMarginPercentage) {
        return null;
      }
      try {
        const breakdown = calculateB2BPriceBreakdown(
          product.priceBreakdown.b2bPriceExclVat,
          product.priceBreakdown.costAmount,
          product.priceBreakdown.exchangeRate,
          product.priceBreakdown.alcoholTaxCents,
          product.priceBreakdown.b2bMarginPercentage,
          membershipLoading ? 0 : discountPercentage,
          product.priceBreakdown.b2bShippingPerBottleSek ?? 0,
        );
        return breakdown.total;
      } catch {
        return null;
      }
    }, [warehouseBreakdown, product.priceBreakdown, discountPercentage, membershipLoading]);

    const content = (
      <>
        <SimpleProductImage product={product} />
      </>
    );

    return (
      <div className="relative w-full aspect-[3/4] md:aspect-square bg-muted group overflow-hidden">
        {isWineBox && discountInfo && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {Math.round(discountInfo.discountPercentage)}% OFF
            </Badge>
          </div>
        )}

        {onProductClick ? (
          <button
            type="button"
            onClick={() => onProductClick(product.handle)}
            className="block size-full focus-visible:outline-none cursor-pointer text-left"
            aria-label={`View details for ${product.title}`}
          >
            {content}
          </button>
        ) : (
          <Link
            href={`${inviteBasePath}/product/${product.handle}`}
            className="block size-full focus-visible:outline-none"
            aria-label={`View details for ${product.title}`}
            prefetch
          >
            {content}
          </Link>
        )}

        {/* Info overlay - same styling as platform ProductCard */}
        <div className="absolute inset-0 p-2 w-full pointer-events-none">
          <div className="flex gap-6 justify-between items-baseline px-3 py-1 w-full font-semibold">
            <div className="flex flex-col">
              <p className="text-xs md:text-sm uppercase 2xl:text-base text-balance text-foreground">
                {product.title}
              </p>
              {product.producerName && (
                <p className="text-[10px] md:text-xs text-muted-foreground font-normal">
                  {product.producerName}
                </p>
              )}
              <StockBadge
                b2bStock={(product as any).b2bStock}
                availableForSale={product.availableForSale}
                className="mt-0.5"
              />
            </div>
            {product.priceRange && (
              <div className="flex flex-col gap-1 items-end text-xs md:text-sm uppercase 2xl:text-base">
                {showExclVat ? (
                  <>
                    {/* Always show producer price on B2B sites if available */}
                    {(producerBreakdown || fallbackProducerPrice) ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] md:text-[9px] text-muted-foreground font-normal leading-tight">
                          Shipped from producer
                        </span>
                        <MemberPrice
                          amount={product.priceRange.minVariantPrice.amount}
                          currencyCode={product.priceRange.minVariantPrice.currencyCode}
                          className="text-xs md:text-sm uppercase 2xl:text-base"
                          calculatedTotalPrice={
                            producerBreakdown 
                              ? producerBreakdown.total / 1.25 
                              : fallbackProducerPrice!
                          }
                          forceShowExclVat={true}
                        />
                      </div>
                    ) : null}
                    {/* Always show warehouse price on B2B sites if available */}
                    {(warehouseBreakdown || fallbackWarehousePrice) ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] md:text-[9px] text-muted-foreground font-normal leading-tight">
                          Shipped from warehouse
                        </span>
                        <MemberPrice
                          amount={product.priceRange.minVariantPrice.amount}
                          currencyCode={product.priceRange.minVariantPrice.currencyCode}
                          className="text-xs md:text-sm uppercase 2xl:text-base"
                          calculatedTotalPrice={
                            warehouseBreakdown 
                              ? warehouseBreakdown.total 
                              : fallbackWarehousePrice!
                          }
                          forceShowExclVat={true}
                        />
                      </div>
                    ) : null}
                    {/* Fallback if neither price is available */}
                    {!producerBreakdown && !warehouseBreakdown && !fallbackProducerPrice && !fallbackWarehousePrice && (
                      <MemberPrice
                        amount={product.priceRange.minVariantPrice.amount}
                        currencyCode={product.priceRange.minVariantPrice.currencyCode}
                        className="text-xs md:text-sm uppercase 2xl:text-base"
                        priceExclVatOverride={
                          (product as any).b2bPriceExclVat ??
                          (product as any).priceBreakdown?.b2bPriceExclVat
                        }
                      />
                    )}
                  </>
                ) : (
                  <MemberPrice
                    amount={product.priceRange.minVariantPrice.amount}
                    currencyCode={product.priceRange.minVariantPrice.currencyCode}
                    className="text-xs md:text-sm uppercase 2xl:text-base"
                    priceExclVatOverride={
                      (product as any).b2bPriceExclVat ??
                      (product as any).priceBreakdown?.b2bPriceExclVat
                    }
                  />
                )}
                {isWineBox && discountInfo && (
                  <span className="line-through opacity-30 text-[10px] md:text-xs text-muted-foreground">
                    {formatPrice(
                      showExclVat
                        ? priceExclVat(discountInfo.totalWinePrice)
                        : Math.round(discountInfo.totalWinePrice).toString(),
                      product.priceRange.minVariantPrice.currencyCode,
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* View product hint - visible on hover */}
          <div className="absolute inset-x-3 bottom-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="px-3 py-2 rounded-md bg-white/95 backdrop-blur-sm text-sm font-medium text-foreground flex items-center gap-2">
              View product
              <ArrowRightIcon className="size-4" />
            </span>
          </div>
        </div>
      </div>
    );
  },
);

BrowseProductCard.displayName = "BrowseProductCard";
