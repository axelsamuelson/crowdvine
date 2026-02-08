"use client";

import { Badge } from "@/components/ui/badge";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { cn } from "@/lib/utils";

interface StockBadgeProps {
  availableForSale: boolean;
  className?: string;
}

/**
 * In stock / Out of stock badge. Only visible on dirtywine.se for business members
 * and on business invite pages (/b/, /ib/). Matches platform badge design.
 */
export function StockBadge({ availableForSale, className }: StockBadgeProps) {
  const showBadge = useB2BPriceMode();

  if (!showBadge) return null;

  return (
    <Badge
      className={cn(
        availableForSale
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {availableForSale ? "I lager" : "Slutsålt"}
    </Badge>
  );
}
