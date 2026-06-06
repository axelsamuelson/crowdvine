"use client";

import {
  PdpPriceBadge,
  pdpHeroTabBadgeClass,
} from "@/components/pdp/pdp-price-badge";
import { usePalletZoneStatus } from "@/components/pdp/pallet-zone-status-provider";
import { cn } from "@/lib/utils";

export function EarlyBirdBadge({
  variant = "inline",
}: {
  variant?: "inline" | "hero-tab";
}) {
  const { allowEarlyBird, data } = usePalletZoneStatus();

  if (!allowEarlyBird || !data) return null;

  return (
    <PdpPriceBadge
      className={cn(variant === "hero-tab" && pdpHeroTabBadgeClass)}
    >
      Early bird · {data.discountTier}%
    </PdpPriceBadge>
  );
}
