"use client";

import { Product } from "@/lib/shopify/types";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

function isShopPath(path: string): boolean {
  return (
    path === "/vin" ||
    path.startsWith("/vin/") ||
    path === "/wine" ||
    path.startsWith("/wine/")
  );
}

interface ProductsContextType {
  products: Product[];
  setProducts: (products: Product[]) => void;
  originalProducts: Product[];
  setOriginalProducts: (products: Product[]) => void;
  /** Slugs of price sources that have at least one wine in the current list. */
  availableSourceSlugs: string[];
  setAvailableSourceSlugs: (slugs: string[]) => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(
  undefined,
);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [availableSourceSlugs, setAvailableSourceSlugs] = useState<string[]>(
    [],
  );

  useLayoutEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    const previousPath = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (isShopPath(previousPath) && isShopPath(pathname)) return;
    setProducts([]);
    setOriginalProducts([]);
    setAvailableSourceSlugs([]);
  }, [pathname]);

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
