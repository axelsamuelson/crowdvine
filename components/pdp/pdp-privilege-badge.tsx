"use client";

import { MembershipDiscountTab } from "@/components/product/membership-discount-tab";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

/** PACT-only member discount tab — hidden on Dirty Wine. */
export function PdpPrivilegeBadge() {
  const isB2B = useB2BPriceMode();
  if (isB2B) return null;
  return <MembershipDiscountTab requireDiscount variant="hero-tab" />;
}
