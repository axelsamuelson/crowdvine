"use client";

import dynamic from "next/dynamic";

/**
 * Cart modal pulls motion/react + validation UI. Defer until client so the
 * root/header hydration path stays lean (major TBT contributor).
 */
const CartModal = dynamic(() => import("@/components/cart/modal"), {
  ssr: false,
  loading: () => (
    <div
      className="relative flex h-10 w-10 items-center justify-center"
      aria-hidden
    />
  ),
});

export function CartModalDynamic() {
  return <CartModal />;
}
