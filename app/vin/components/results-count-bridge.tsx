"use client";

import { useLayoutEffect } from "react";
import { useProducts } from "@/components/shop/products-provider";

/** Syncs server-fetched product count into layout MobileFilters before paint. */
export function ResultsCountBridge({ count }: { count: number }) {
  const { setServerResultsCount } = useProducts();

  useLayoutEffect(() => {
    setServerResultsCount(count);
  }, [count, setServerResultsCount]);

  return null;
}
