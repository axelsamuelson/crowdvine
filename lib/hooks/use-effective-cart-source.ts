"use client";

import { useCartSource } from "@/components/cart/cart-source-context";
import type { CartSource } from "@/components/cart/add-to-cart-with-source";
import { B2B_PRODUCER_ORDERS_ENABLED } from "@/lib/b2b/flags";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

/**
 * Cart/price source that matches what checkout actually uses.
 * When producer orders are paused on dirtywine, warehouse (B2B) pricing is forced
 * so PDP/PLP/breakdown stay aligned with the shop cards.
 */
export function useEffectiveCartSource(): CartSource {
  const { selectedSource } = useCartSource();
  const isB2B = useB2BPriceMode();

  if (isB2B && !B2B_PRODUCER_ORDERS_ENABLED) {
    return "warehouse";
  }

  return selectedSource;
}
