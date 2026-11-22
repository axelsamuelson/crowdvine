"use client";

import { Cart, CartItem, Product, ProductVariant } from "@/lib/shopify/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import * as CartActions from "@/components/cart/actions";
import {
  ADD_TO_CART_FETCH_TIMEOUT_MS,
  CART_MERGE_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  interpretCartMergeHttpStatus,
  shouldApplyHydratedCart,
} from "@/lib/cart/cart-merge-client";

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
  /** False until the first server/cache cart resolve finishes — hide badge until then. */
  cartReady: boolean;
  cart: Cart | undefined;
  addItem: (
    variant: ProductVariant,
    product: Product,
  ) => Promise<Cart | null>;
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
      console.log("🛒 ADD_ITEM reducer - product.producerName:", product.producerName);
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
  /**
   * True for the full add/update fetch (not just the optimistic transition).
   * Prevents the header badge from flashing CART (0) while the first add
   * is in flight after an empty cart.
   */
  const [isMutating, setIsMutating] = useState(false);
  const [cart, setCart] = useState<Cart | undefined>(undefined);
  /**
   * True only after the first server getCart settles.
   * Never set from localStorage alone — a stale cache of (0) must not flash
   * in the header badge before the real quantity is known.
   */
  const [cartReady, setCartReady] = useState(false);
  const [optimisticCart, updateOptimisticCart] = useOptimistic<
    Cart | undefined,
    CartAction
  >(cart, cartReducer);
  /** Bumps on add/update/cart-refresh so a late empty hydrate cannot wipe lines. */
  const mutationEpochRef = useRef(0);
  const cartQtyRef = useRef(0);

  const applyCart = useCallback((next: Cart | undefined) => {
    setCart(next);
    cartQtyRef.current =
      next && typeof next.totalQuantity === "number" ? next.totalQuantity : 0;
  }, []);

  useEffect(() => {
    // Warm drawer from cache (optional) but keep cartReady false until server.
    try {
      const cachedCart = localStorage.getItem("cart-cache");
      if (cachedCart) {
        const cacheTime = localStorage.getItem("cart-cache-time");
        if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000) {
          const parsedCart = JSON.parse(cachedCart) as Cart;
          // Only warm non-empty cache into state; empty cache would flash (0).
          if (
            parsedCart &&
            typeof parsedCart.totalQuantity === "number" &&
            parsedCart.totalQuantity > 0
          ) {
            applyCart(parsedCart);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load cached cart:", error);
    }

    let cancelled = false;
    const hydrateEpoch = mutationEpochRef.current;
    void (async () => {
      // Merge is always fire-and-forget: never block getCart or add-to-cart.
      // Server reads httpOnly auth cookies — no document.cookie guest guess.
      // Invariant: shouldBlockAddToCartOnMerge() === false (see unit tests).
      const mergePromise = (async (): Promise<Cart | null> => {
        try {
          const mergeRes = await fetchWithTimeout(
            "/api/cart/merge",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ strategy: "auto" }),
            },
            CART_MERGE_FETCH_TIMEOUT_MS,
          );
          let body: {
            merged?: boolean;
            cart?: Cart;
            ok?: boolean;
          } | null = null;
          try {
            body = (await mergeRes.json()) as typeof body;
          } catch {
            body = null;
          }
          const verdict = interpretCartMergeHttpStatus(mergeRes.status, body);
          if (verdict.kind !== "merged") return null;
          return body?.cart ?? null;
        } catch {
          // Timeout / network: silent — getCart still hydrates.
          return null;
        }
      })();

      // Hydrate immediately in parallel with merge (add-to-cart never waits).
      try {
        const freshCart = await CartActions.getCart();
        if (cancelled) return;
        const incomingQty = freshCart?.totalQuantity ?? 0;
        const apply = shouldApplyHydratedCart({
          incomingTotalQuantity: incomingQty,
          currentTotalQuantity: cartQtyRef.current,
          hydrateEpoch,
          mutationEpoch: mutationEpochRef.current,
        });
        if (!apply) {
          // Keep lines that landed while merge/hydrate was in flight.
        } else if (freshCart) {
          applyCart(freshCart);
          try {
            localStorage.setItem("cart-cache", JSON.stringify(freshCart));
            localStorage.setItem("cart-cache-time", Date.now().toString());
          } catch (error) {
            console.warn("Failed to cache cart:", error);
          }
        } else {
          applyCart(undefined);
        }
      } catch {
        // Silent fail — badge stays on skeleton until we mark ready below.
      } finally {
        if (!cancelled) setCartReady(true);
      }

      // Logged-in merge (httpOnly cookies): apply richer cart when it arrives.
      if (cancelled) return;
      const mergedCart = await mergePromise;
      if (cancelled || !mergedCart) return;
      const applyMerged = shouldApplyHydratedCart({
        incomingTotalQuantity: mergedCart.totalQuantity ?? 0,
        currentTotalQuantity: cartQtyRef.current,
        hydrateEpoch,
        mutationEpoch: mutationEpochRef.current,
      });
      if (!applyMerged) return;
      applyCart(mergedCart);
      try {
        localStorage.setItem("cart-cache", JSON.stringify(mergedCart));
        localStorage.setItem("cart-cache-time", Date.now().toString());
      } catch (error) {
        console.warn("Failed to cache cart:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyCart]);

  // Separate useEffect for cart-refresh event listener
  useEffect(() => {
    const handleCartRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(
        "🛒 [CONTEXT] Cart refresh event received",
        customEvent.detail,
      );

      if (customEvent.detail) {
        console.log("🛒 [CONTEXT] Updating cart with new data");
        mutationEpochRef.current += 1;
        applyCart(customEvent.detail as Cart);
        try {
          localStorage.setItem(
            "cart-cache",
            JSON.stringify(customEvent.detail),
          );
          localStorage.setItem("cart-cache-time", Date.now().toString());
        } catch (error) {
          console.warn("Failed to cache cart:", error);
        }
      } else {
        console.log("🛒 [CONTEXT] No cart data in event, fetching fresh");
        // No cart data, fetch fresh
        CartActions.getCart().then((freshCart) => {
          if (freshCart) {
            mutationEpochRef.current += 1;
            applyCart(freshCart);
          }
        });
      }
    };

    console.log("🛒 [CONTEXT] Setting up cart-refresh listener");
    window.addEventListener("cart-refresh", handleCartRefresh);

    return () => {
      console.log("🛒 [CONTEXT] Removing cart-refresh listener");
      window.removeEventListener("cart-refresh", handleCartRefresh);
    };
  }, [applyCart]);

  const update = useCallback(
    async (lineId: string, merchandiseId: string, nextQuantity: number) => {
      mutationEpochRef.current += 1;
      setIsMutating(true);
      try {
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
          applyCart(fresh);
          // Update localStorage cache
          try {
            localStorage.setItem("cart-cache", JSON.stringify(fresh));
            localStorage.setItem("cart-cache-time", Date.now().toString());
          } catch (error) {
            console.warn("Failed to cache cart:", error);
          }
        }
      } finally {
        setIsMutating(false);
      }
    },
    [updateOptimisticCart, applyCart],
  );

  const add = useCallback(
    async (variant: ProductVariant, product: Product) => {
      console.log(
        "🛒 Cart add() called with variant:",
        variant.id,
        "product:",
        product.id,
      );

      // Normalize variant ID by removing -default suffix for comparison
      const normalizedVariantId = variant.id.replace("-default", "");
      const previousQuantity =
        optimisticCart?.lines.find(
          (l) => l.merchandise.id === normalizedVariantId,
        )?.quantity || 0;

      console.log(
        "🛒 Previous quantity:",
        previousQuantity,
        "normalized ID:",
        normalizedVariantId,
      );

      mutationEpochRef.current += 1;
      setIsMutating(true);
      // Optimistic update for instant UI feedback
      startTransition(() => {
        console.log("🛒 Performing optimistic update...");
        console.log("🛒 Product has producerName:", product.producerName);
        updateOptimisticCart({
          type: "ADD_ITEM",
          payload: { variant, product, previousQuantity },
        });
      });

      // Perform server update using simple API route (optimized)
      console.log("🛒 Calling simple API route for addItem...");
      let fresh: Cart | null = null;
      try {
        const response = await fetchWithTimeout(
          "/api/cart/simple-add",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId: variant.id }),
          },
          ADD_TO_CART_FETCH_TIMEOUT_MS,
        );

        if (response.ok) {
          const result = await response.json();
          fresh = result.cart ?? null;
          console.log(
            "🛒 Simple API route returned:",
            fresh ? "success" : "null",
          );

          if (fresh) {
            console.log(
              "🛒 Setting cart with fresh data, items:",
              fresh.lines.length,
            );
            applyCart(fresh);
            // Update localStorage cache
            try {
              localStorage.setItem("cart-cache", JSON.stringify(fresh));
              localStorage.setItem("cart-cache-time", Date.now().toString());
            } catch (error) {
              console.warn("Failed to cache cart:", error);
            }
          }
        } else {
          console.error(
            "🛒 Simple API route failed with status:",
            response.status,
          );
          const errorText = await response.text();
          console.error("🛒 Error response:", errorText);
          // If add failed, revert optimistic update
          applyCart(cart);
        }
      } catch (apiError) {
        console.error("🛒 Simple API route error:", apiError);
        // Timeout / network: recover UI (stop spinner) without customer error toast.
        applyCart(cart);
      } finally {
        setIsMutating(false);
      }
      return fresh;
    },
    [updateOptimisticCart, optimisticCart, cart, applyCart],
  );

  const value = useMemo<UseCartReturn>(
    () => ({
      cart: optimisticCart, // Don't create empty cart - let it be undefined until loaded
      addItem: add,
      updateItem: update,
      // Cover optimistic transition + full network mutate so badge never
      // flashes (0) during the first add-to-cart.
      isPending: isPending || isMutating,
      cartReady,
    }),
    [optimisticCart, add, update, isPending, isMutating, cartReady],
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

/**
 * Nested override for design-review / fixture surfaces. Replaces the parent
 * {@link CartProvider} for descendants only (e.g. an in-page CartModal).
 */
export function FixtureCartProvider({
  cart,
  children,
}: {
  cart: Cart;
  children: React.ReactNode;
}) {
  const value = useMemo<UseCartReturn>(
    () => ({
      cart,
      cartReady: true,
      isPending: false,
      addItem: async () => cart,
      updateItem: async () => {},
    }),
    [cart],
  );
  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

/**
 * Same context as {@link useCart} but returns undefined when there is no provider
 * (e.g. layout segments or SSR quirks). Prefer {@link useCart} when the tree must
 * always be under {@link CartProvider}.
 */
export function useCartOptional(): UseCartReturn | undefined {
  return useContext(CartContext);
}
