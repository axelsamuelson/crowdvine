"use client";

import dynamic from "next/dynamic";

/**
 * Cart modal pulls motion/react + validation UI. Defer until client so the
 * root/header hydration path stays lean (major TBT contributor).
 */
const CartModal = dynamic(() => import("@/components/cart/modal"), {
  ssr: false,
  loading: () => (
    <span
      className="inline-block h-7 w-10 shrink-0 rounded-sm bg-muted/40 animate-pulse md:w-16"
      aria-hidden
      data-testid="cart-badge-loading"
    />
  ),
});

export function CartModalDynamic() {
  return <CartModal />;
}
