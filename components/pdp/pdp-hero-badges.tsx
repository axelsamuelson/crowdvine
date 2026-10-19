"use client";

import { EarlyBirdBadge } from "@/components/pdp/early-bird-badge";
import { PdpPrivilegeBadge } from "@/components/pdp/pdp-privilege-badge";
import { NewBadge } from "@/components/product/new-badge";
import { StockBadge } from "@/components/product/stock-badge";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import type { B2BWineAvailability } from "@/lib/b2b-pallet-stock";

interface PdpHeroBadgesProps {
  b2bStock?: number | null;
  availableForSale?: boolean;
  b2bAvailability?: B2BWineAvailability;
  b2bIsNew?: boolean;
}

/**
 * Hero tabs peeking above the white box (top-left).
 * Dirty Wine: NEW + stock status (no early-bird / member discount).
 * PACT: early-bird + privilege discount tabs.
 */
export function PdpHeroBadges({
  b2bStock,
  availableForSale,
  b2bAvailability,
  b2bIsNew,
}: PdpHeroBadgesProps) {
  const isB2B = useB2BPriceMode();

  if (isB2B) {
    return (
      <>
        <NewBadge show={b2bIsNew === true} variant="hero-tab" />
        <StockBadge
          variant="hero-tab"
          b2bStock={b2bStock}
          availableForSale={availableForSale}
          b2bAvailability={b2bAvailability}
        />
      </>
    );
  }

  return (
    <>
      <EarlyBirdBadge variant="hero-tab" />
      <PdpPrivilegeBadge />
    </>
  );
}
