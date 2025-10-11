"use client";

import { useState, useTransition, useMemo } from "react";
import { CirclePlus, Minus, Plus } from "lucide-react";
import { Product, ProductVariant } from "@/lib/shopify/types";
import { useCart } from "./cart-context";
import { Button } from "../ui/button";
import { useSelectedVariant } from "@/components/products/variant-selector";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Loader } from "../ui/loader";
import { cn } from "@/lib/utils";

interface AddToCartWithQuantityProps {
  product: Product;
  className?: string;
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

export function AddToCartWithQuantity({
  product,
  className,
}: AddToCartWithQuantityProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const [isLoading, startTransition] = useTransition();
  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string }>();
  const searchParams = useSearchParams();

  const { variants } = product;
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

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < 99) { // Max 99 bottles
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();

    if (resolvedVariant) {
      startTransition(async () => {
        // Add items one by one (cart system doesn't support quantity in single call)
        for (let i = 0; i < quantity; i++) {
          await addItem(resolvedVariant, product);
        }
      });
    }
  };

  const isDisabled = !product.availableForSale || !resolvedVariant || isLoading;

  return (
    <form onSubmit={handleAddToCart} className={cn("w-full", className)}>
      <div className="flex items-center gap-3">
        {/* Quantity Selector */}
        <div className="flex items-center border-2 border-gray-300 rounded-md overflow-hidden bg-white">
          {/* Minus Button */}
          <button
            type="button"
            onClick={handleDecrease}
            disabled={quantity <= 1 || isDisabled}
            className={cn(
              "px-3 py-2 hover:bg-gray-100 transition-colors border-r border-gray-300",
              quantity <= 1 || isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <Minus className="w-4 h-4 text-gray-700" />
          </button>

          {/* Quantity Display */}
          <div className="px-4 py-2 min-w-[3rem] text-center">
            <span className="text-base font-medium text-gray-900">
              {quantity}
            </span>
          </div>

          {/* Plus Button */}
          <button
            type="button"
            onClick={handleIncrease}
            disabled={quantity >= 99 || isDisabled}
            className={cn(
              "px-3 py-2 hover:bg-gray-100 transition-colors border-l border-gray-300",
              quantity >= 99 || isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <Plus className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <Button
          type="submit"
          disabled={isDisabled}
          size="lg"
          className="flex-1 bg-black hover:bg-black/90 text-white border-black rounded-md"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={isLoading ? "loading" : "text"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex justify-between items-center w-full"
            >
              {isLoading ? (
                <div className="flex justify-center items-center w-full">
                  <Loader size="default" />
                </div>
              ) : (
                <>
                  <span>
                    {!product.availableForSale
                      ? "Out Of Stock"
                      : !resolvedVariant
                        ? "Select one"
                        : quantity === 1
                          ? "Add To Cart"
                          : `Add ${quantity} To Cart`}
                  </span>
                  <CirclePlus className="text-white" />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </Button>
      </div>
    </form>
  );
}

