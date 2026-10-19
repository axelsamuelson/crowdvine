"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CartSource } from "./add-to-cart-with-source";
import { B2B_PRODUCER_ORDERS_ENABLED } from "@/lib/b2b/flags";

interface CartSourceContextType {
  selectedSource: CartSource;
  setSelectedSource: (source: CartSource) => void;
}

const CartSourceContext = createContext<CartSourceContextType | undefined>(
  undefined,
);

const defaultB2BSource: CartSource = B2B_PRODUCER_ORDERS_ENABLED
  ? "producer"
  : "warehouse";

export function CartSourceProvider({ children }: { children: ReactNode }) {
  const [selectedSource, setSelectedSource] =
    useState<CartSource>(defaultB2BSource);

  return (
    <CartSourceContext.Provider value={{ selectedSource, setSelectedSource }}>
      {children}
    </CartSourceContext.Provider>
  );
}

export function useCartSource() {
  const context = useContext(CartSourceContext);
  // On B2C sites (pactwines.com), CartSourceProvider is not used
  // Return default "producer" source to avoid errors
  if (!context) {
    return {
      selectedSource: "producer" as CartSource,
      setSelectedSource: () => {}, // No-op on B2C sites
    };
  }
  return context;
}
