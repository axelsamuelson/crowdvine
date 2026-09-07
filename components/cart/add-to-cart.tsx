"use client";

import { CirclePlus } from "lucide-react";
import { Product, ProductVariant } from "@/lib/shopify/types";
import type { Cart } from "@/lib/shopify/types";
import { useMemo, useTransition } from "react";
import { useCart } from "./cart-context";
import { Button, ButtonProps } from "../ui/button";
import { useSelectedVariant } from "@/components/products/variant-selector";
import { useParams, useSearchParams } from "next/navigation";
import { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader } from "../ui/loader";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { pricesFromCartAfterAdd } from "@/lib/analytics/cart-event-prices";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { BOTTLE_PACK_SIZE } from "@/lib/cart/bottle-pack";

interface AddToCartProps extends ButtonProps {
  product: Product;
  iconOnly?: boolean;
  icon?: ReactNode;
  previewDisabled?: boolean;
}

interface AddToCartButtonProps extends ButtonProps {
  product: Product;
  selectedVariant?: ProductVariant | null;
  iconOnly?: boolean;
  icon?: ReactNode;
  className?: string;
  previewDisabled?: boolean;
}

const getBaseProductVariant = (product: Product): ProductVariant => {
  return {
    id: product.id,
    title: product.title,
    availableForSale: product.availableForSale,
    selectedOptions: [],
    price: product.priceRange.minVariantPrice,
  };
};

async function addB2BPack(
  variantId: string,
  quantity: number,
): Promise<Cart | null> {
  const response = await fetch("/api/cart/add-quantity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      variantId,
      quantity,
      source: "producer",
      enforcePack: true,
    }),
  });

  if (!response.ok) return null;

  const result = await response.json();
  if (typeof window !== "undefined" && result.cart) {
    window.dispatchEvent(
      new CustomEvent("cart-refresh", { detail: result.cart }),
    );
  }
  return (result.cart as Cart | undefined) ?? null;
}

export function AddToCartButton({
  product,
  selectedVariant,
  className,
  iconOnly = false,
  icon = <CirclePlus />,
  previewDisabled = false,
  ...buttonProps
}: AddToCartButtonProps) {
  const { t } = useTranslations();
  const { addItem } = useCart();
  const isB2B = useB2BPriceMode();
  const [isLoading, startTransition] = useTransition();

  // Resolve variant locally only for variantless products (purely synchronous)
  const resolvedVariant = useMemo(() => {
    if (selectedVariant) return selectedVariant;
    if (product.variants.length === 0) return getBaseProductVariant(product);
    if (product.variants.length === 1) return product.variants[0];
    return undefined;
  }, [selectedVariant, product]);

  const getButtonText = () => {
    if (!resolvedVariant) return t("product.selectOne");
    return t("product.addToCart");
  };

  // Producer items can always be added, so don't disable based on availableForSale
  const isDisabled = !resolvedVariant || isLoading;

  const getLoaderSize = () => {
    const buttonSize = buttonProps.size;
    if (
      buttonSize === "sm" ||
      buttonSize === "icon-sm" ||
      buttonSize === "icon"
    )
      return "sm";
    if (buttonSize === "icon-lg") return "default";
    if (buttonSize === "lg") return "lg";
    return "default";
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (previewDisabled) return;

        if (resolvedVariant) {
          startTransition(async () => {
            const cart = isB2B
              ? await addB2BPack(resolvedVariant.id, BOTTLE_PACK_SIZE)
              : await addItem(resolvedVariant, product);
            const { list_price, unit_price } = pricesFromCartAfterAdd(
              cart,
              product.id,
              product,
            );
            void AnalyticsTracker.trackAddToCart(
              product.id,
              product.title,
              list_price,
              {
                quantity: isB2B ? BOTTLE_PACK_SIZE : 1,
                ...(isB2B ? { source: "b2b" as const } : {}),
                list_price,
                unit_price,
                price_version: "v1",
              },
            );
          });
        }
      }}
      className={className}
    >
      <Button
        type="submit"
        aria-label={
          !resolvedVariant ? t("product.selectOne") : t("product.addToCart")
        }
        disabled={isDisabled}
        className={
          iconOnly
            ? "size-12 [&_svg:not([class*='size-'])]:size-7 bg-black hover:bg-black/90 text-white border-black rounded-md"
            : "flex relative justify-between items-center w-full bg-black hover:bg-black/90 text-white border-black rounded-md"
        }
        {...buttonProps}
      >
        <AnimatePresence initial={false} mode="wait">
          {iconOnly ? (
            <motion.div
              key={isLoading ? "loading" : "icon"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center items-center"
            >
              {isLoading ? (
                <Loader size={getLoaderSize()} />
              ) : (
                <span className="inline-block text-white">{icon}</span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={isLoading ? "loading" : getButtonText()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center items-center w-full"
            >
              {isLoading ? (
                <Loader size={getLoaderSize()} />
              ) : (
                <div className="flex justify-between items-center w-full">
                  <span>{getButtonText()}</span>
                  <CirclePlus className="text-white" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </form>
  );
}

export function AddToCart({
  product,
  className,
  iconOnly = false,
  icon = <CirclePlus />,
  previewDisabled = false,
  ...buttonProps
}: AddToCartProps) {
  const { variants } = product;
  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string }>();
  const searchParams = useSearchParams();

  const hasNoVariants = variants.length === 0;
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = selectedVariant?.id || defaultVariantId;
  const isTargetingProduct =
    pathname.handle === product.id || searchParams.get("pid") === product.id;

  const resolvedVariant = useMemo(() => {
    if (hasNoVariants) return getBaseProductVariant(product);
    if (!isTargetingProduct && !defaultVariantId) return undefined;
    return variants.find((variant) => variant.id === selectedVariantId);
  }, [
    hasNoVariants,
    product,
    isTargetingProduct,
    defaultVariantId,
    variants,
    selectedVariantId,
  ]);

  return (
    <AddToCartButton
      product={product}
      selectedVariant={resolvedVariant}
      className={className}
      iconOnly={iconOnly}
      icon={icon}
      previewDisabled={previewDisabled}
      {...buttonProps}
    />
  );
}
