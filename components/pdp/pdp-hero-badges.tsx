"use client";

import { EarlyBirdBadge } from "@/components/pdp/early-bird-badge";
import { PdpPrivilegeBadge } from "@/components/pdp/pdp-privilege-badge";

/** Early bird + Privilege tabs peeking above the hero white box (top-left). */
export function PdpHeroBadges() {
  return (
    <>
      <EarlyBirdBadge variant="hero-tab" />
      <PdpPrivilegeBadge />
    </>
  );
}
