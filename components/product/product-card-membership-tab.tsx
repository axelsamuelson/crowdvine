"use client";

import { MembershipDiscountTab } from "@/components/product/membership-discount-tab";

/** Membership level + discount % tab for product cards (shows 0% when no discount). */
export function ProductCardMembershipTab() {
  return <MembershipDiscountTab requireDiscount={false} variant="hero-tab" />;
}
