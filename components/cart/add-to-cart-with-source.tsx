"use client";

import { useState, useTransition, useMemo } from "react";
import { CirclePlus, Minus, Plus, Warehouse, Factory } from "lucide-react";
import { Product, ProductVariant } from "@/lib/shopify/types";
import { Button } from "../ui/button";
import { useSelectedVariant } from "@/components/products/variant-selector";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Loader } from "../ui/loader";
import { cn } from "@/lib/utils";
import { useCartSource } from "./cart-source-context";

export type CartSource = "producer" | "warehouse";

interface AddToCartWithSourceProps {
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

export function AddToCartWithSource({
  product,
  className,
}: AddToCartWithSourceProps) {
  const [quantity, setQuantity] = useState(1);
  const { selectedSource, setSelectedSource } = useCartSource();
  const [isLoading, startTransition] = useTransition();
  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string }>();
  const searchParams = useSearchParams();

  // Check if product is out of stock for warehouse
  const isOutOfStock = !product.availableForSale || (product.b2bStock != null && product.b2bStock <= 0);
  const isWarehouseDisabled = isOutOfStock;
  // Producer can always be added (even if out of stock)
  const isProducerAvailable = true;

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
    if (quantity < 99) {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = (e: React.FormEvent, source: CartSource) => {
    e.preventDefault();

    if (resolvedVariant) {
      startTransition(async () => {
        try {
          console.log("🛒 [PDP] Adding", quantity, "items to cart with source:", source);

          // Call new batch endpoint to add multiple items at once with source
          const response = await fetch("/api/cart/add-quantity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variantId: resolvedVariant.id,
              quantity: quantity,
              source: source,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(
              "🛒 [PDP] Added successfully, cart has",
              result.cart.totalQuantity,
              "items",
            );

            // Dispatch event with the updated cart data
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("cart-refresh", { detail: result.cart }),
              );
              console.log("🛒 [PDP] Dispatched cart-refresh event");
            }

            // Reset quantity to 1 after successful add
            setQuantity(1);
          } else {
            const errorText = await response.text();
            console.error("🛒 [PDP] Failed to add items to cart", {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            });
          }
        } catch (error) {
          console.error("🛒 [PDP] Error adding to cart:", error);
        }
      });
    }
  };

  // Producer can always be added (even if out of stock), warehouse requires stock
  const isDisabled = !resolvedVariant || isLoading || (selectedSource === "warehouse" && isWarehouseDisabled);
  // Producer is never disabled due to stock
  const isAddToCartDisabled = !resolvedVariant || isLoading || (selectedSource === "warehouse" && isWarehouseDisabled);

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Source Selection - Two buttons side by side */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSelectedSource("producer")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border-2 transition-all",
            selectedSource === "producer"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black/20 hover:border-black/40"
          )}
        >
          <Factory className="w-4 h-4" />
          <span className="text-sm font-medium">Producer</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedSource("warehouse")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border-2 transition-all relative",
            selectedSource === "warehouse"
              ? isWarehouseDisabled
                ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                : "bg-black text-white border-black"
              : isWarehouseDisabled
                ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-black border-black/20 hover:border-black/40"
          )}
          disabled={isWarehouseDisabled}
        >
          <Warehouse className={cn("w-4 h-4", isWarehouseDisabled && "opacity-50")} />
          <span className="text-sm font-medium">
            {isWarehouseDisabled ? "Warehouse | Out of stock" : "Warehouse"}
          </span>
        </button>
      </div>

      {/* Quantity and Add to Cart */}
      <form onSubmit={(e) => handleAddToCart(e, selectedSource)} className="w-full">
        <div className="flex items-center gap-3">
          {/* Quantity Selector - Black theme to match Add To Cart */}
          <div className="flex items-center border-2 border-black rounded-md overflow-hidden bg-black">
            {/* Minus Button */}
            <button
              type="button"
              onClick={handleDecrease}
              disabled={quantity <= 1 || isAddToCartDisabled}
              className={cn(
                "px-3 py-2 hover:bg-gray-900 transition-colors border-r border-gray-700",
                quantity <= 1 || isAddToCartDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer",
              )}
            >
              <Minus className="w-4 h-4 text-white" />
            </button>

            {/* Quantity Display */}
            <div className="px-4 py-2 min-w-[3rem] text-center">
              <span className="text-base font-semibold text-white">
                {quantity}
              </span>
            </div>

            {/* Plus Button */}
            <button
              type="button"
              onClick={handleIncrease}
              disabled={quantity >= 99 || isAddToCartDisabled}
              className={cn(
                "px-3 py-2 hover:bg-gray-900 transition-colors border-l border-gray-700",
                quantity >= 99 || isAddToCartDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer",
              )}
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <Button
            type="submit"
            disabled={isAddToCartDisabled}
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
                      {!resolvedVariant
                        ? "Select one"
                        : selectedSource === "warehouse" && isWarehouseDisabled
                          ? "Out Of Stock"
                          : quantity === 1
                            ? `Add To Cart (${selectedSource === "producer" ? "Producer" : "Warehouse"})`
                            : `Add ${quantity} To Cart (${selectedSource === "producer" ? "Producer" : "Warehouse"})`}
                    </span>
                    <CirclePlus className="text-white" />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </Button>
        </div>
      </form>
    </div>
  );
}
