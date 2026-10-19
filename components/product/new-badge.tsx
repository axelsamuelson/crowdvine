"use client";

import {
  PdpPriceBadge,
  pdpHeroTabBadgeClass,
} from "@/components/pdp/pdp-price-badge";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

interface NewBadgeProps {
  /** When true, wine is on a Dirty Wine pallet marked is_new. */
  show?: boolean;
  variant?: "pill" | "hero-tab";
  className?: string;
}

const pillClassName =
  "inline-flex items-center justify-center gap-0.5 md:gap-1 rounded-full px-1 md:px-1.5 py-0.5 text-[7px] md:text-[9px] font-medium w-[42px] md:w-[52px] bg-violet-100 text-violet-700";

/**
 * NEW badge for Dirty Wine wines on a pallet marked is_new.
 * Same visual language as StockBadge (pill / hero-tab).
 */
export function NewBadge({
  show = false,
  variant = "pill",
  className,
}: NewBadgeProps) {
  const isB2B = useB2BPriceMode();
  const { t } = useTranslations();

  if (!isB2B || !show) return null;

  const label = t("product.newBadge");

  if (variant === "hero-tab") {
    return (
      <PdpPriceBadge
        customAppearance
        className={cn(
          pdpHeroTabBadgeClass,
          "inline-flex items-center gap-1.5 bg-violet-700 text-white",
          className,
        )}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-violet-200" />
        {label}
      </PdpPriceBadge>
    );
  }

  return (
    <span className={cn(pillClassName, className)}>
      <span className="size-1 md:size-1.5 shrink-0 rounded-full bg-violet-600" />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
