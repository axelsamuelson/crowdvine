"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";

export type StockStatus = "out" | "few" | "in";

interface StockBadgeProps {
  /** B2B stock quantity. Null/0 = out of stock. Undefined = not tracked (e.g. wine box). */
  b2bStock?: number | null;
  /** Fallback when b2bStock is undefined (legacy availableForSale) */
  availableForSale?: boolean;
  className?: string;
}

const badgeShellClassName =
  "inline-flex items-center justify-center gap-0.5 md:gap-1 rounded-full px-1 md:px-1.5 py-0.5 text-[7px] md:text-[9px] font-medium w-[52px] md:w-[70px]";

function StockBadgePlaceholder({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(badgeShellClassName, "invisible shrink-0", className)}
    >
      <span className="size-1 md:size-1.5 rounded-full shrink-0" />
      <span className="whitespace-nowrap">In stock</span>
    </span>
  );
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
  const { t } = useTranslations();
  const isB2B = useB2BPriceMode();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [fewLeftThreshold, setFewLeftThreshold] = useState(5);

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

  const onTastingSummary = pathname?.includes("/tasting/");
  const mayShowBadge =
    onTastingSummary || typeof b2bStock === "number" || isB2B;
  const showBadge = isMounted && (isB2B || onTastingSummary);

  if (!showBadge) {
    if (mayShowBadge && !isMounted) {
      return <StockBadgePlaceholder className={className} />;
    }
    return null;
  }

  // In stock endast när b2b_stock är ett tal och >= 1. Null, undefined och 0 = Out of stock.
  const stock = b2bStock;
  const hasStock = typeof stock === "number" && stock > 0;
  const status: StockStatus = !hasStock
    ? "out"
    : stock <= fewLeftThreshold
      ? "few"
      : "in";

  const label =
    status === "out"
      ? t("product.outOfStock")
      : status === "few"
        ? (stock as number) === 1
          ? t("product.lastBottle")
          : t("product.lastBottles", { count: stock as number })
        : t("product.inStock");

  return (
    <span
      className={cn(
        badgeShellClassName,
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
