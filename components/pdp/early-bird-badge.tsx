"use client";

import {
  PdpPriceBadge,
  pdpHeroTabBadgeClass,
} from "@/components/pdp/pdp-price-badge";
import { usePalletZoneStatus } from "@/components/pdp/pallet-zone-status-provider";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { cn } from "@/lib/utils";

export function EarlyBirdBadge({
  variant = "inline",
}: {
  variant?: "inline" | "hero-tab";
}) {
  const isB2B = useB2BPriceMode();
  const { allowEarlyBird, data } = usePalletZoneStatus();

  // Dirty Wine has no early-bird pricing — keep the badge PACT-only.
  if (isB2B || !allowEarlyBird || !data) return null;

  return (
    <PdpPriceBadge
      className={cn(variant === "hero-tab" && pdpHeroTabBadgeClass)}
    >
      Early bird · {data.discountTier}%
    </PdpPriceBadge>
  );
}
