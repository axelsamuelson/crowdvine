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
  if (!context) {
    throw new Error("useCartSource must be used within CartSourceProvider");
  }
  return context;
}
