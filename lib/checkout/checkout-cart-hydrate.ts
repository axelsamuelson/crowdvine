/**
 * Checkout cart/profile hydration policy.
 *
 * Initial paint must not wait on /api/cart/merge (CartProvider already merges
 * in the background). After OTP / ensureProfileAfterAuth, merge must finish
 * before an empty cart is treated as authoritative.
 */

import { CART_MERGE_FETCH_TIMEOUT_MS } from "@/lib/cart/cart-merge-client";

/** Soft budget for checkout profile / cart / merge fetches (~8s). */
export const CHECKOUT_FETCH_TIMEOUT_MS = CART_MERGE_FETCH_TIMEOUT_MS;

export type CheckoutHydrateReason = "initial" | "post_otp";

/**
 * First paint: never block the skeleton on merge.
 * OTP: wait for merge before showing an empty cart (guest lines may still
 * be merging into the authenticated cart).
 */
export function shouldAwaitMergeBeforeEmptyCart(
  reason: CheckoutHydrateReason,
): boolean {
  return reason === "post_otp";
}

/**
 * Checkout skips its own initial merge to avoid a second /api/cart/merge
 * alongside CartProvider. OTP / explicit merge modal still call merge.
 */
export function shouldCheckoutRunInitialMerge(): boolean {
  return false;
}

export function shouldShowCheckoutCartSkeleton(args: {
  loading: boolean;
  cartFetchDone: boolean;
  postAuthCartReady: boolean;
  cart: unknown | null;
}): boolean {
  return (
    args.loading ||
    !args.cartFetchDone ||
    !args.postAuthCartReady ||
    args.cart == null
  );
}

/**
 * Flags after a cart fetch attempt settles (ok, HTTP error, or timeout).
 * Always clears the skeleton gate inputs so the page cannot hang forever.
 */
export function checkoutFlagsAfterCartSettled(): {
  cartFetchDone: true;
  loading: false;
} {
  return { cartFetchDone: true, loading: false };
}

/**
 * Plan for ensureProfileAfterAuth / initial mount: profile and cart work run
 * in parallel; merge only gates the cart path when reason is post_otp.
 */
export function planCheckoutHydrate(reason: CheckoutHydrateReason): {
  parallelProfileAndCart: true;
  awaitMergeBeforeCart: boolean;
  timeoutMs: number;
} {
  return {
    parallelProfileAndCart: true,
    awaitMergeBeforeCart: shouldAwaitMergeBeforeEmptyCart(reason),
    timeoutMs: CHECKOUT_FETCH_TIMEOUT_MS,
  };
}

/** Empty cart placeholder used when fetch fails/times out (fail soft). */
export function emptyCheckoutCartPlaceholder(): {
  id: string;
  lines: [];
  totalQuantity: 0;
  cost: {
    totalAmount: { amount: "0"; currencyCode: "SEK" };
    subtotalAmount: { amount: "0"; currencyCode: "SEK" };
    totalTaxAmount: { amount: "0"; currencyCode: "SEK" };
  };
} {
  return {
    id: "",
    lines: [],
    totalQuantity: 0,
    cost: {
      totalAmount: { amount: "0", currencyCode: "SEK" },
      subtotalAmount: { amount: "0", currencyCode: "SEK" },
      totalTaxAmount: { amount: "0", currencyCode: "SEK" },
    },
  };
}
