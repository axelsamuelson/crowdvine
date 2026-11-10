"use client";

import {
  PdpPriceBadge,
  pdpHeroTabBadgeClass,
} from "@/components/pdp/pdp-price-badge";
import { usePalletZoneStatus } from "@/components/pdp/pallet-zone-status-provider";
import { formatCartDiscountLabel } from "@/lib/cart/discount-label";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import { cn } from "@/lib/utils";

export function EarlyBirdBadge({
  variant = "inline",
}: {
  variant?: "inline" | "hero-tab";
}) {
  const isB2B = useB2BPriceMode();
  const { allowEarlyBird, data } = usePalletZoneStatus();
  const { context } = useShoppingContext();

  // Dirty Wine has no early-bird pricing — keep the badge PACT-only.
  if (isB2B || !allowEarlyBird || !data) return null;

  const earlyBirdPercent = Number(data.discountTier) || 0;
  // When runtime switch forces 0% (or fill is past early-bird), hide entirely.
  if (earlyBirdPercent <= 0) return null;

  const label =
    formatCartDiscountLabel({
      memberPercent: 0,
      earlyBirdPercent,
      locale: context.locale === "en" ? "en" : "sv",
    }) ?? `Early bird −${earlyBirdPercent} %`;

  return (
    <PdpPriceBadge
      className={cn(variant === "hero-tab" && pdpHeroTabBadgeClass)}
    >
      {label}
    </PdpPriceBadge>
  );
}
