"use client";

import React, { Suspense, memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/shopify/types";
import { AddToCart, AddToCartButton } from "@/components/cart/add-to-cart";
import { formatPrice } from "@/lib/shopify/utils";
import { VariantSelector } from "../variant-selector";
import { ProductImage } from "./product-image";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, CirclePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MemberPrice } from "@/components/ui/member-price";
import { useCart } from "@/components/cart/cart-context";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

export const ProductCard = memo(({ product }: { product: Product }) => {
  const hasNoOptions = product.options.length === 0;
  const hasOneOptionWithOneValue =
    product.options.length === 1 && product.options[0].values.length === 1;
  const justHasColorOption =
    product.options.length === 1 &&
    product.options[0].name.toLowerCase() === "color";

  const renderInCardAddToCart =
    hasNoOptions || hasOneOptionWithOneValue || justHasColorOption;

  // Check if this is a wine box product
  const isWineBox = product.productType === "wine-box";
  const discountInfo = (product as any).discountInfo;

  // Scroll detection for mobile overlay
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Only show when at least 50% of the card is visible
          setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        });
      },
      {
        threshold: [0, 0.5, 1],
        rootMargin: "-10% 0px -10% 0px", // Account for top and bottom margins
      }
    );

    const currentCard = cardRef.current;
    if (currentCard) {
      observer.observe(currentCard);
    }

    return () => {
      if (currentCard) {
        observer.unobserve(currentCard);
      }
    };
  }, []);

  // Get base variant for products without options
  const getBaseProductVariant = (): any => {
    if (product.variants.length === 0) {
      return {
        id: product.id,
        title: product.title,
        availableForSale: product.availableForSale,
        selectedOptions: [],
        price: product.priceRange.minVariantPrice,
      };
    }
    if (product.variants.length === 1) {
      return product.variants[0];
    }
    return null;
  };

  const handleAddToCart = () => {
    const variant = getBaseProductVariant();
    if (variant) {
      addItem(variant, product);
      // Track add to cart event
      AnalyticsTracker.trackAddToCart(
        product.id,
        product.title,
        parseFloat(product.priceRange.minVariantPrice.amount)
      );
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full aspect-[3/4] md:aspect-square bg-muted group overflow-hidden"
    >
      {/* Discount Badge for Wine Boxes */}
      {isWineBox && discountInfo && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            {Math.round(discountInfo.discountPercentage)}% OFF
          </Badge>
        </div>
      )}

      <Link
        href={`/product/${product.handle}`}
        className="block size-full focus-visible:outline-none"
        aria-label={`View details for ${product.title}, price ${product.priceRange.minVariantPrice}`}
        prefetch
      >
        <Suspense fallback={null}>
          <ProductImage product={product} />
        </Suspense>
      </Link>

      {/* Interactive Overlay */}
      <div className="absolute inset-0 p-2 w-full pointer-events-none">
        {/* Mobile & Desktop Default: Info overlay (hidden on mobile, visible on desktop until hover) */}
        <div className="hidden md:flex gap-6 justify-between items-baseline px-3 py-1 w-full font-semibold transition-all duration-300 translate-y-0 md:group-hover:opacity-0 md:group-focus-visible:opacity-0 md:group-hover:-translate-y-full md:group-focus-visible:-translate-y-full">
          <div className="flex flex-col">
            <p className="text-xs md:text-sm uppercase 2xl:text-base text-balance">
              {product.title}
            </p>
            {product.producerName && (
              <p className="text-[10px] md:text-xs text-muted-foreground font-normal">
                {product.producerName}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center text-xs md:text-sm uppercase 2xl:text-base">
            <MemberPrice
              amount={product.priceRange.minVariantPrice.amount}
              currencyCode={product.priceRange.minVariantPrice.currencyCode}
              className="text-xs md:text-sm uppercase 2xl:text-base"
            />
            {isWineBox && discountInfo && (
              <span className="line-through opacity-30 text-[10px] md:text-xs">
                {formatPrice(
                  Math.round(discountInfo.totalWinePrice).toString(),
                  product.priceRange.minVariantPrice.currencyCode,
                )}
              </span>
            )}
          </div>
        </div>

        {/* Mobile: Premium bottom overlay with Add to Cart button (visible on scroll) */}
        {renderInCardAddToCart && isVisible && (
          <div
            className="md:hidden absolute inset-x-2 bottom-2 px-3 py-2.5 rounded-md bg-white/95 backdrop-blur-sm pointer-events-auto shadow-lg"
          >
            <div className="flex gap-2 items-center justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-semibold truncate leading-tight">
                  {product.title}
                </p>
                {product.producerName && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {product.producerName}
                  </p>
                )}
              </div>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart();
                }}
                disabled={!product.availableForSale || !getBaseProductVariant()}
                className="bg-black hover:bg-black/90 text-white border-black rounded-md shrink-0"
                size="sm"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">Add to cart</span>
                  <CirclePlus className="size-3.5" />
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Mobile: View Product button for products with variants (visible on scroll) */}
        {!renderInCardAddToCart && isVisible && (
          <div
            className="md:hidden absolute inset-x-2 bottom-2 px-3 py-2.5 rounded-md bg-white/95 backdrop-blur-sm pointer-events-auto shadow-lg"
          >
            <div className="flex gap-2 items-center justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-semibold truncate leading-tight">
                  {product.title}
                </p>
                {product.producerName && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {product.producerName}
                  </p>
                )}
              </div>
              <Button
                className="bg-black hover:bg-black/90 text-white border-black rounded-md shrink-0"
                size="sm"
                asChild
              >
                <Link href={`/product/${product.handle}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">View</span>
                    <ArrowRightIcon className="size-3.5" />
                  </div>
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Desktop: Move Add to Cart into the white info box instead of top-right */}

        {/* Desktop Hover: White card with full details (only on desktop) */}
        <div className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-1/3 group-hover:translate-y-0 group-focus-visible:translate-y-0 group-hover:pointer-events-auto group-focus-visible:pointer-events-auto">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
            <div className="flex flex-col">
              <p className="text-lg font-semibold text-pretty">
                {product.title}
              </p>
              {product.producerName && (
                <p className="text-sm text-muted-foreground font-normal">
                  {product.producerName}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
              <MemberPrice
                amount={product.priceRange.minVariantPrice.amount}
                currencyCode={product.priceRange.minVariantPrice.currencyCode}
                className="text-lg font-semibold"
                showBadge={true}
              />
              {isWineBox && discountInfo && (
                <span className="text-base line-through opacity-30">
                  {formatPrice(
                    Math.round(discountInfo.totalWinePrice).toString(),
                    product.priceRange.minVariantPrice.currencyCode,
                  )}
                </span>
              )}
            </div>
            {renderInCardAddToCart ? (
              <Suspense fallback={null}>
                <div className="self-center">
                  <VariantSelector product={product} />
                </div>
              </Suspense>
            ) : (
              <Suspense
                fallback={
                  <AddToCartButton
                    product={product}
                    size="sm"
                    className="bg-black hover:bg-black/90 text-white border-black rounded-md"
                  />
                }
              >
                <AddToCart
                  product={product}
                  size="sm"
                  className="bg-black hover:bg-black/90 text-white border-black rounded-md"
                />
              </Suspense>
            )}

            {renderInCardAddToCart ? (
              <Suspense
                fallback={
                  <AddToCartButton
                    className="col-start-2"
                    product={product}
                    size="sm"
                  />
                }
              >
                <AddToCart
                  className="col-start-2"
                  size="sm"
                  product={product}
                />
              </Suspense>
            ) : (
              <Button
                className="col-start-2 bg-black hover:bg-black/90 text-white border-black rounded-md"
                size="sm"
                asChild
              >
                <Link href={`/product/${product.handle}`}>
                  <div className="flex justify-between items-center w-full">
                    <span>View Product</span>
                    <ArrowRightIcon />
                  </div>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
