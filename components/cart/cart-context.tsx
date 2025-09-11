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
import { usePathname } from "next/navigation";
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
      const updatedLines = currentCart.lines
        .map((item) => {
          if (item.merchandise.id !== merchandiseId) return item;
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
      const existingItem = currentCart.lines.find(
        (item) => item.merchandise.id === variant.id,
      );
      const targetQuantity = previousQuantity + 1;

      const updatedLines = existingItem
        ? currentCart.lines.map((item) => {
            if (item.merchandise.id !== variant.id) return item;

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
                id: variant.id,
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
  const pathname = usePathname();

  // Initialize with empty cart to prevent undefined context
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Try to load from localStorage first for instant display
    const loadCachedCart = () => {
      try {
        const cachedCart = localStorage.getItem('cart-cache');
        if (cachedCart) {
          const parsedCart = JSON.parse(cachedCart);
          // Check if cache is not too old (5 minutes)
          const cacheTime = localStorage.getItem('cart-cache-time');
          if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000) {
            setCart(parsedCart);
            setIsInitialized(true); // Mark as initialized immediately with cached data
            return parsedCart;
          }
        }
      } catch (error) {
        console.warn('Failed to load cached cart:', error);
      }
      return null;
    };

    // Load cached cart immediately
    const cachedCart = loadCachedCart();
    
    // If we have cached data, we're already initialized
    if (cachedCart) {
      // Still fetch fresh data in background, but don't block UI
      CartActions.getCart().then((freshCart) => {
        if (freshCart) {
          setCart(freshCart);
          // Cache the fresh cart data
          try {
            localStorage.setItem('cart-cache', JSON.stringify(freshCart));
            localStorage.setItem('cart-cache-time', Date.now().toString());
          } catch (error) {
            console.warn('Failed to cache cart:', error);
          }
        }
      }).catch(() => {
        // Silent fail for background refresh
      });
      return;
    }
    
    // No cached data, fetch from server
    CartActions.getCart().then((freshCart) => {
      if (freshCart) {
        setCart(freshCart);
        // Cache the fresh cart data
        try {
          localStorage.setItem('cart-cache', JSON.stringify(freshCart));
          localStorage.setItem('cart-cache-time', Date.now().toString());
        } catch (error) {
          console.warn('Failed to cache cart:', error);
        }
      } else {
        setCart(undefined);
      }
      setIsInitialized(true);
    }).catch(() => {
      setIsInitialized(true);
    });
  }, []);

  const update = useCallback(
    async (lineId: string, merchandiseId: string, nextQuantity: number) => {
      startTransition(() => {
        updateOptimisticCart({
          type: "UPDATE_ITEM",
          payload: { merchandiseId, nextQuantity },
        });
      });
      const fresh = await CartActions.updateItem({
        lineId,
        quantity: nextQuantity,
      });
      if (fresh) setCart(fresh);
    },
    [updateOptimisticCart],
  );

  const add = useCallback(
    async (variant: ProductVariant, product: Product) => {
      const previousQuantity =
        optimisticCart?.lines.find((l) => l.merchandise.id === variant.id)
          ?.quantity || 0;
      startTransition(() => {
        updateOptimisticCart({
          type: "ADD_ITEM",
          payload: { variant, product, previousQuantity },
        });
      });
      const fresh = await CartActions.addItem(variant.id);
      if (fresh) {
        setCart(fresh);
      } else {
        // If add failed, revert optimistic update
        setCart(cart);
      }
    },
    [updateOptimisticCart, optimisticCart, cart],
  );

  const value = useMemo<UseCartReturn>(
    () => ({
      cart: optimisticCart || createEmptyCart(),
      addItem: add,
      updateItem: update,
      isPending,
    }),
    [optimisticCart, add, update, isPending],
  );

  // Don't render children until cart is initialized, but allow admin pages to bypass this
  if (!isInitialized) {
    // Check if we're on an admin page - if so, render immediately with empty cart
    const isAdminPage = pathname.startsWith('/admin');
    if (isAdminPage) {
      return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-[1.5rem] opacity-60">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-3 h-3 border border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin"></div>
          <span>Cart</span>
        </div>
      </div>
    );
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): UseCartReturn {
  const context = useContext(CartContext);
  if (context === undefined) {
    // Check if we're in a server-side environment
    if (typeof window === 'undefined') {
      console.warn("useCart called during SSR - this should not happen");
    }
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
