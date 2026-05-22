"use client";

import { useDisplayMoney } from "@/lib/hooks/use-display-money";

/**
 * Format amounts already in the shopper's display currency (e.g. cart lines from CartService).
 * For SEK-backed amounts, use `useDisplayMoney().formatSek`.
 */
export function useFormatPrice() {
  const { formatDisplay } = useDisplayMoney();
  return formatDisplay;
}
