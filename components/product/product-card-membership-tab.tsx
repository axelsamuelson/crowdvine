"use client";

import { MembershipDiscountTab } from "@/components/product/membership-discount-tab";

/** Membership level + discount % tab — hidden when member discount is 0 / OFF. */
export function ProductCardMembershipTab() {
  return <MembershipDiscountTab requireDiscount variant="hero-tab" />;
}
