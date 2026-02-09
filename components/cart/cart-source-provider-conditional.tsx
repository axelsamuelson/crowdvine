"use client";

import { ReactNode } from "react";
import { CartSourceProvider } from "./cart-source-context";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

interface CartSourceProviderConditionalProps {
  children: ReactNode;
}

/**
 * Conditionally wraps children with CartSourceProvider only on B2B sites
 * (dirtywine.se). On B2C sites (pactwines.com), just returns children.
 */
export function CartSourceProviderConditional({
  children,
}: CartSourceProviderConditionalProps) {
  const isB2B = useB2BPriceMode();

  if (isB2B) {
    return <CartSourceProvider>{children}</CartSourceProvider>;
  }

  return <>{children}</>;
}
