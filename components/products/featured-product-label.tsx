"use client";

import { Badge } from "../ui/badge";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { cn } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import { AddToCart, AddToCartButton } from "../cart/add-to-cart";
import { ShopWineCasePicker } from "../cart/shop-wine-case-sheet";
import { Suspense } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/shopify/utils";
import { MemberPrice } from "@/components/ui/member-price";
import { getProductListPriceSek } from "@/lib/price-breakdown";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { Button } from "@/components/ui/button";

export function FeaturedProductLabel({
  product,
  principal = false,
  showBadge = true,
  className,
}: {
  product: Product;
  principal?: boolean;
  showBadge?: boolean;
  className?: string;
}) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const listPriceSek = getProductListPriceSek(product);
  const isB2B = useB2BPriceMode();
  const productType = product.productType;
  const isWineBox = productType === "wine-box";
  // Match PLP: B2C producer wines use case purchase (6 bottles), not single-bottle ATC.
  const shopCaseWineCta =
    !isB2B && !isWineBox && productType === "wine" && Boolean(product.producerId);

  const cartCta = shopCaseWineCta ? (
    <Suspense
      fallback={
        <Button
          type="button"
          disabled
          size={principal ? "lg" : "sm"}
          className={cn(
            "bg-black hover:bg-black/90 text-white border-black rounded-md",
            principal ? "w-full" : "w-auto shrink-0",
          )}
        >
          <span className={principal ? undefined : "text-xs"}>
            {t("shop.addCase")}
          </span>
        </Button>
      }
    >
      <ShopWineCasePicker
        product={product}
        size={principal ? "lg" : "sm"}
        className={principal ? "w-full" : "w-auto shrink-0"}
      />
    </Suspense>
  ) : (
    <Suspense
      fallback={
        <AddToCartButton
          className={
            principal ? "flex gap-20 justify-between pr-2" : undefined
          }
          size={principal ? "lg" : undefined}
          product={product}
          iconOnly={!principal}
          variant={principal ? undefined : "default"}
        />
      }
    >
      <AddToCart
        className={
          principal ? "flex gap-20 justify-between pr-2" : undefined
        }
        size={principal ? "lg" : undefined}
        product={product}
        iconOnly={!principal}
        variant={principal ? undefined : "default"}
      />
    </Suspense>
  );

  if (principal) {
    return (
      <div
        className={cn(
          "flex flex-col grid-cols-2 gap-y-3 p-4 w-full bg-white md:w-fit md:rounded-md md:grid",
          className,
        )}
      >
        <div className="col-span-2">
          {showBadge && (
            <Badge className="font-black capitalize rounded-full">
              {t("home.bestSeller")}
            </Badge>
          )}
        </div>
        <Link
          href={paths.product(product.handle)}
          className="col-span-1 self-start text-2xl font-semibold"
        >
          {product.title}
        </Link>
        <div className="col-span-1 mb-10">
          {product.producerName && (
            <p className="mb-2 text-sm text-muted-foreground font-normal">
              {product.producerName}
            </p>
          )}
          {product.tags.length > 0 ? (
            <p className="mb-3 text-sm italic font-medium">
              {product.tags.join(". ")}
            </p>
          ) : null}
          <p className="text-sm font-medium line-clamp-3">
            {product.description}
          </p>
        </div>
        <div className="flex col-span-1 gap-3 items-center text-2xl font-semibold md:self-end">
          <MemberPrice
            amount={product.priceRange.minVariantPrice.amount}
            currencyCode={product.priceRange.minVariantPrice.currencyCode}
            basePriceSek={listPriceSek ?? undefined}
            className="text-2xl font-semibold"
            showBadge={true}
          />
          {product.compareAtPrice && (
            <span className="line-through opacity-30">
              {formatPrice(
                product.compareAtPrice.amount,
                product.compareAtPrice.currencyCode,
              )}
            </span>
          )}
        </div>
        {cartCta}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 items-center p-2 pl-8 bg-white rounded-md max-w-full",
        className,
      )}
    >
      <div className="pr-6 leading-4 overflow-hidden min-w-0 flex-1">
        <Link
          href={paths.product(product.handle)}
          className="inline-block w-full truncate text-base font-semibold opacity-80 mb-1.5"
        >
          {product.title}
        </Link>
        {product.producerName && (
          <p className="text-xs text-muted-foreground font-normal mb-1">
            {product.producerName}
          </p>
        )}
        <div className="flex gap-2 items-center text-base font-semibold">
          <MemberPrice
            amount={product.priceRange.minVariantPrice.amount}
            currencyCode={product.priceRange.minVariantPrice.currencyCode}
            basePriceSek={listPriceSek ?? undefined}
            className="text-base font-semibold"
            showBadge={true}
          />
          {product.compareAtPrice && (
            <span className="text-sm line-through opacity-30">
              {formatPrice(
                product.compareAtPrice.amount,
                product.compareAtPrice.currencyCode,
              )}
            </span>
          )}
        </div>
      </div>
      {cartCta}
    </div>
  );
}
