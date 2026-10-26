"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  PdpPriceBadge,
  pdpHeroTabBadgeClass,
} from "@/components/pdp/pdp-price-badge";
import { useWineFewLeftThreshold } from "@/lib/context/wine-settings-context";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { B2BWineAvailability } from "@/lib/b2b-pallet-stock";

export type StockStatus = "out" | "few" | "in" | "incoming";

interface StockBadgeProps {
  /** B2B stock quantity. Null/0 = out of stock. Undefined = not tracked (e.g. wine box). */
  b2bStock?: number | null;
  /** Fallback when b2bStock is undefined (legacy availableForSale) */
  availableForSale?: boolean;
  /** Dirtywine assortment state. in_stock keeps the few-left logic. */
  b2bAvailability?: B2BWineAvailability;
  /** Pill (product cards) or hero-tab peeking above the PDP white box. */
  variant?: "pill" | "hero-tab";
  className?: string;
}

const badgeShellClassName =
  "inline-flex items-center justify-center gap-0.5 md:gap-1 rounded-full px-1 md:px-1.5 py-0.5 text-[7px] md:text-[9px] font-medium w-[52px] md:w-[70px]";

function StockBadgePlaceholder({
  variant,
  className,
}: {
  variant: "pill" | "hero-tab";
  className?: string;
}) {
  if (variant === "hero-tab") {
    return (
      <span
        aria-hidden
        className={cn(pdpHeroTabBadgeClass, "invisible", className)}
      >
        In stock
      </span>
    );
  }

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
 * In stock / Few left / Out of stock / Coming soon badge.
 * Visible on dirtywine.se (and business invite / tasting pages).
 */
export function StockBadge({
  b2bStock,
  availableForSale = true,
  b2bAvailability,
  variant = "pill",
  className,
}: StockBadgeProps) {
  const { t } = useTranslations();
  const isB2B = useB2BPriceMode();
  const pathname = usePathname();
  const fewLeftThreshold = useWineFewLeftThreshold();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onTastingSummary = pathname?.includes("/tasting/");
  const mayShowBadge =
    onTastingSummary || typeof b2bStock === "number" || isB2B;
  const showBadge = isMounted && (isB2B || onTastingSummary);

  if (!showBadge) {
    if (mayShowBadge && !isMounted) {
      return <StockBadgePlaceholder variant={variant} className={className} />;
    }
    return null;
  }

  // in_stock keeps the existing few-left logic. incoming and out_of_stock are explicit.
  const stock = b2bStock;
  const hasStock = typeof stock === "number" && stock > 0;
  const status: StockStatus =
    b2bAvailability === "incoming"
      ? "incoming"
      : b2bAvailability === "out_of_stock"
        ? "out"
        : hasStock
          ? stock <= fewLeftThreshold
            ? "few"
            : "in"
          : "out";

  const label =
    status === "incoming"
      ? t("product.incoming")
      : status === "out"
        ? t("product.outOfStock")
        : status === "few"
          ? (stock as number) === 1
            ? t("product.lastBottle")
            : t("product.lastBottles", { count: stock as number })
          : t("product.inStock");

  if (variant === "hero-tab") {
    return (
      <PdpPriceBadge
        customAppearance
        className={cn(
          pdpHeroTabBadgeClass,
          "inline-flex items-center gap-1.5",
          status === "out" && "bg-stone-500 text-white",
          status === "incoming" && "bg-sky-600 text-white",
          status === "few" && "bg-amber-600 text-white",
          status === "in" && "bg-emerald-700 text-white",
          className,
        )}
      >
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            status === "out" && "bg-white/70",
            status === "incoming" && "bg-sky-200",
            status === "few" && "bg-amber-200",
            status === "in" && "bg-emerald-200",
          )}
        />
        {label}
      </PdpPriceBadge>
    );
  }

  return (
    <span
      className={cn(
        badgeShellClassName,
        status === "out" &&
          "bg-muted text-muted-foreground w-[62px] md:w-[80px]",
        status === "incoming" &&
          "bg-sky-100 text-sky-700 w-[62px] md:w-[80px]",
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
          status === "incoming" && "bg-sky-600",
          status === "few" && "bg-amber-600",
          status === "in" && "bg-emerald-600",
        )}
      />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
