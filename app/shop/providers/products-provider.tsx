"use client";

import { Product } from "@/lib/shopify/types";
import { createContext, useContext, useState, ReactNode } from "react";

interface ProductsContextType {
  products: Product[];
  setProducts: (products: Product[]) => void;
  originalProducts: Product[];
  setOriginalProducts: (products: Product[]) => void;
  /** Slugs of price sources that have at least one wine in the current list. Used to hide empty "Buy at" options. */
  availableSourceSlugs: string[];
  setAvailableSourceSlugs: (slugs: string[]) => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(
  undefined,
);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [availableSourceSlugs, setAvailableSourceSlugs] = useState<string[]>([]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        setProducts,
        originalProducts,
        setOriginalProducts,
        availableSourceSlugs,
        setAvailableSourceSlugs,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
