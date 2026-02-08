"use client";

import { useEffect, useState } from "react";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { cn } from "@/lib/utils";

export type StockStatus = "out" | "few" | "in";

interface StockBadgeProps {
  /** B2B stock quantity. Null/0 = out of stock. Undefined = not tracked (e.g. wine box). */
  b2bStock?: number | null;
  /** Fallback when b2bStock is undefined (legacy availableForSale) */
  availableForSale?: boolean;
  className?: string;
}

/**
 * In stock / Few left / Out of stock badge. Only visible on dirtywine.se for business members
 * and on business invite pages. Premium design with configurable few-left threshold.
 */
export function StockBadge({
  b2bStock,
  availableForSale = true,
  className,
}: StockBadgeProps) {
  const showBadge = useB2BPriceMode();
  const [fewLeftThreshold, setFewLeftThreshold] = useState(5);

  useEffect(() => {
    fetch("/api/wine-settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.fewLeftThreshold === "number") setFewLeftThreshold(d.fewLeftThreshold);
      })
      .catch(() => {});
  }, []);

  if (!showBadge) return null;

  // When b2bStock is undefined (wine box etc), use availableForSale
  const stock = b2bStock;
  const status: StockStatus =
    stock === undefined
      ? availableForSale
        ? "in"
        : "out"
      : stock == null || stock <= 0
        ? "out"
        : stock <= fewLeftThreshold
          ? "few"
          : "in";

  const label =
    status === "out"
      ? "Out of stock"
      : status === "few"
        ? (stock as number) === 1
          ? "Last bottle"
          : `Last ${stock}`
        : "In stock";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        status === "out" &&
          "bg-black/60 text-white/95 backdrop-blur-sm",
        status === "few" &&
          "bg-amber-500/90 text-amber-950 backdrop-blur-sm",
        status === "in" &&
          "bg-emerald-600/90 text-white backdrop-blur-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}
