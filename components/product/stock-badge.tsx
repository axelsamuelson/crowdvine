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
  const isB2B = useB2BPriceMode();
  const [isMounted, setIsMounted] = useState(false);
  const [fewLeftThreshold, setFewLeftThreshold] = useState(5);

  // Hydration safety: only show badge after client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/wine-settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.fewLeftThreshold === "number") setFewLeftThreshold(d.fewLeftThreshold);
      })
      .catch(() => {});
  }, []);

  // On server, always return null to avoid hydration mismatch
  // On client, check isB2B after mount
  const showBadge = isMounted && isB2B;

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
        "inline-flex items-center justify-center gap-0.5 md:gap-1 rounded-full px-1 md:px-1.5 py-0.5 text-[7px] md:text-[9px] font-medium",
        status === "out" &&
          "bg-muted text-muted-foreground w-[62px] md:w-[80px]",
        status === "few" &&
          "bg-amber-100 text-amber-700 w-[52px] md:w-[70px]",
        status === "in" &&
          "bg-emerald-100 text-emerald-700 w-[52px] md:w-[70px]",
        className,
      )}
    >
      <span
        className={cn(
          "size-1 md:size-1.5 rounded-full shrink-0",
          status === "out" && "bg-muted-foreground",
          status === "few" && "bg-amber-600",
          status === "in" && "bg-emerald-600",
        )}
      />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
