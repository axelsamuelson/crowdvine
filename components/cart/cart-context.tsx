"use client";

import { Cart, CartItem, Product, ProductVariant } from "@/lib/shopify/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import * as CartActions from "@/components/cart/actions";

export type UpdateType = "plus" | "minus" | "delete";

type CartAction =
  | {
      type: "UPDATE_ITEM";
      payload: { merchandiseId: string; nextQuantity: number };
    }
  | {
      type: "ADD_ITEM";
      payload: {
        variant: ProductVariant;
        product: Product;
        previousQuantity: number;
      };
    };

type UseCartReturn = {
  isPending: boolean;
  cart: Cart | undefined;
  addItem: (variant: ProductVariant, product: Product) => Promise<void>;
  updateItem: (
    lineId: string,
    merchandiseId: string,
    nextQuantity: number,
    updateType: UpdateType,
  ) => Promise<void>;
};

type CartContextType = UseCartReturn;

const CartContext = createContext<CartContextType | undefined>(undefined);

function calculateItemCost(quantity: number, price: string): string {
  return (Number(price) * quantity).toString();
}

// removed old updateCartItem helper; logic in reducer now uses nextQuantity directly

// removed createOrUpdateCartItem helper in favor of explicit logic in reducer

function updateCartTotals(
  lines: CartItem[],
): Pick<Cart, "totalQuantity" | "cost"> {
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = lines.reduce(
    (sum, item) => sum + Number(item.cost.totalAmount.amount),
    0,
  );
  const currencyCode = lines[0]?.cost.totalAmount.currencyCode ?? "USD";

  return {
    totalQuantity,
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
      totalTaxAmount: { amount: "0", currencyCode },
    },
  };
}

function createEmptyCart(): Cart {
  return {
    id: "",
    checkoutUrl: "",
    cost: {
      subtotalAmount: { amount: "0", currencyCode: "USD" },
      totalAmount: { amount: "0", currencyCode: "USD" },
      totalTaxAmount: { amount: "0", currencyCode: "USD" },
    },
    totalQuantity: 0,
    lines: [],
  };
}

function cartReducer(state: Cart | undefined, action: CartAction): Cart {
  const currentCart = state || createEmptyCart();

  switch (action.type) {
    case "UPDATE_ITEM": {
      const { merchandiseId, nextQuantity } = action.payload;
      // Normalize merchandise ID by removing -default suffix for comparison
      const normalizedMerchandiseId = merchandiseId.replace("-default", "");
      const updatedLines = currentCart.lines
        .map((item) => {
          if (item.merchandise.id !== normalizedMerchandiseId) return item;
          if (nextQuantity <= 0) return null;

          const singleItemAmount =
            Number(item.cost.totalAmount.amount) / item.quantity;
          const newTotalAmount = calculateItemCost(
            nextQuantity,
            singleItemAmount.toString(),
          );

          return {
            ...item,
            quantity: nextQuantity,
            cost: {
              ...item.cost,
              totalAmount: {
                ...item.cost.totalAmount,
                amount: newTotalAmount,
              },
            },
          } satisfies CartItem;
        })
        .filter(Boolean) as CartItem[];

      if (updatedLines.length === 0) {
        return {
          ...currentCart,
          lines: [],
          totalQuantity: 0,
          cost: {
            ...currentCart.cost,
            totalAmount: { ...currentCart.cost.totalAmount, amount: "0" },
          },
        };
      }

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    case "ADD_ITEM": {
      const { variant, product, previousQuantity } = action.payload;
      // Normalize variant ID by removing -default suffix for comparison
      const normalizedVariantId = variant.id.replace("-default", "");
      const existingItem = currentCart.lines.find(
        (item) => item.merchandise.id === normalizedVariantId,
      );
      const targetQuantity = previousQuantity + 1;

      const updatedLines = existingItem
        ? currentCart.lines.map((item) => {
            if (item.merchandise.id !== normalizedVariantId) return item;

            const singleItemAmount =
              Number(item.cost.totalAmount.amount) / item.quantity;
            const newTotalAmount = calculateItemCost(
              targetQuantity,
              singleItemAmount.toString(),
            );

            return {
              ...item,
              quantity: targetQuantity,
              cost: {
                ...item.cost,
                totalAmount: {
                  ...item.cost.totalAmount,
                  amount: newTotalAmount,
                },
              },
            } satisfies CartItem;
          })
        : [
            {
              id: `temp-${Date.now()}`,
              quantity: targetQuantity,
              cost: {
                totalAmount: {
                  amount: calculateItemCost(
                    targetQuantity,
                    variant.price.amount,
                  ),
                  currencyCode: variant.price.currencyCode,
                },
              },
              merchandise: {
                id: normalizedVariantId, // Use normalized ID to match database format
                title: variant.title,
                selectedOptions: variant.selectedOptions,
                product: product,
              },
            } satisfies CartItem,
            ...currentCart.lines,
          ];

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    default:
      return currentCart;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<Cart | undefined>(undefined);
  const [optimisticCart, updateOptimisticCart] = useOptimistic<
    Cart | undefined,
    CartAction
  >(cart, cartReducer);

  useEffect(() => {
    // Try to load from localStorage first for instant display
    const loadCachedCart = () => {
      try {
        const cachedCart = localStorage.getItem("cart-cache");
        if (cachedCart) {
          const parsedCart = JSON.parse(cachedCart);
          // Check if cache is not too old (5 minutes)
          const cacheTime = localStorage.getItem("cart-cache-time");
          if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000) {
            setCart(parsedCart);
            return parsedCart;
          }
        }
      } catch (error) {
        console.warn("Failed to load cached cart:", error);
      }
      return null;
    };

    // Load cached cart immediately
    const cachedCart = loadCachedCart();

    // If we have cached data, we're already initialized
    if (cachedCart) {
      // Still fetch fresh data in background, but don't block UI
      CartActions.getCart()
        .then((freshCart) => {
          if (freshCart) {
            setCart(freshCart);
            // Cache the fresh cart data
            try {
              localStorage.setItem("cart-cache", JSON.stringify(freshCart));
              localStorage.setItem("cart-cache-time", Date.now().toString());
            } catch (error) {
              console.warn("Failed to cache cart:", error);
            }
          }
        })
        .catch(() => {
          // Silent fail for background refresh
        });
      return;
    }

    // No cached data, fetch from server
    CartActions.getCart()
      .then((freshCart) => {
        if (freshCart) {
          setCart(freshCart);
          // Cache the fresh cart data
          try {
            localStorage.setItem("cart-cache", JSON.stringify(freshCart));
            localStorage.setItem("cart-cache-time", Date.now().toString());
          } catch (error) {
            console.warn("Failed to cache cart:", error);
          }
        } else {
          setCart(undefined);
        }
      })
      .catch(() => {
        // Silent fail - cart will remain undefined
      });
  }, []);

  const update = useCallback(
    async (lineId: string, merchandiseId: string, nextQuantity: number) => {
      // Optimistic update for instant UI feedback
      startTransition(() => {
        updateOptimisticCart({
          type: "UPDATE_ITEM",
          payload: { merchandiseId, nextQuantity },
        });
      });
      
      // Perform server update
      const fresh = await CartActions.updateItem({
        lineId,
        quantity: nextQuantity,
      });
      
      if (fresh) {
        setCart(fresh);
        // Update localStorage cache
        try {
          localStorage.setItem("cart-cache", JSON.stringify(fresh));
          localStorage.setItem("cart-cache-time", Date.now().toString());
        } catch (error) {
          console.warn("Failed to cache cart:", error);
        }
      }
    },
    [updateOptimisticCart],
  );

  const add = useCallback(
    async (variant: ProductVariant, product: Product) => {
      console.log("🛒 Cart add() called with variant:", variant.id, "product:", product.id);
      
      // Normalize variant ID by removing -default suffix for comparison
      const normalizedVariantId = variant.id.replace("-default", "");
      const previousQuantity =
        optimisticCart?.lines.find((l) => l.merchandise.id === normalizedVariantId)
          ?.quantity || 0;
      
      console.log("🛒 Previous quantity:", previousQuantity, "normalized ID:", normalizedVariantId);
      
      // Optimistic update for instant UI feedback
      startTransition(() => {
        console.log("🛒 Performing optimistic update...");
        updateOptimisticCart({
          type: "ADD_ITEM",
          payload: { variant, product, previousQuantity },
        });
      });
      
      // Perform server update using simple API route
      console.log("🛒 Calling simple API route for addItem...");
      let fresh = null;
      try {
        const response = await fetch('/api/cart/simple-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId: variant.id })
        });
        
        if (response.ok) {
          const result = await response.json();
          fresh = result.cart;
          console.log("🛒 Simple API route returned:", fresh ? "success" : "null");
        } else {
          console.error("🛒 Simple API route failed with status:", response.status);
          const errorText = await response.text();
          console.error("🛒 Error response:", errorText);
          fresh = null;
        }
      } catch (apiError) {
        console.error("🛒 Simple API route error:", apiError);
        fresh = null;
      }
      
      if (fresh) {
        console.log("🛒 Setting cart with fresh data, items:", fresh.lines.length);
        setCart(fresh);
        // Update localStorage cache
        try {
          localStorage.setItem("cart-cache", JSON.stringify(fresh));
          localStorage.setItem("cart-cache-time", Date.now().toString());
        } catch (error) {
          console.warn("Failed to cache cart:", error);
        }
      } else {
        console.log("🛒 Server update failed, reverting to previous cart");
        // If add failed, revert optimistic update
        setCart(cart);
      }
    },
    [updateOptimisticCart, optimisticCart, cart],
  );

  const value = useMemo<UseCartReturn>(
    () => ({
      cart: optimisticCart, // Don't create empty cart - let it be undefined until loaded
      addItem: add,
      updateItem: update,
      isPending,
    }),
    [optimisticCart, add, update, isPending],
  );

  // Always render children immediately - don't block the UI
  // Cart will load in the background and update when ready
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): UseCartReturn {
  const context = useContext(CartContext);
  if (context === undefined) {
    // Check if we're in a server-side environment
    if (typeof window === "undefined") {
      console.warn("useCart called during SSR - this should not happen");
    }
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
