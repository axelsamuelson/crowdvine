"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CartSource } from "./add-to-cart-with-source";

interface CartSourceContextType {
  selectedSource: CartSource;
  setSelectedSource: (source: CartSource) => void;
}

const CartSourceContext = createContext<CartSourceContextType | undefined>(
  undefined,
);

export function CartSourceProvider({ children }: { children: ReactNode }) {
  const [selectedSource, setSelectedSource] = useState<CartSource>("producer");

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
