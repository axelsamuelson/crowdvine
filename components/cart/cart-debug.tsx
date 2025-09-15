"use client";

import { useCart } from "@/components/cart/cart-context";

export function CartDebug() {
  try {
    const cart = useCart();
    return (
      <div className="p-4 bg-green-100 border border-green-300 rounded">
        <h3>Cart Debug</h3>
        <p>Cart items: {cart.cart?.lines?.length || 0}</p>
        <p>Is pending: {cart.isPending ? "Yes" : "No"}</p>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded">
        <h3>Cart Error</h3>
        <p>Error: {error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }
}
