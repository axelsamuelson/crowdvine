"use client";

import { useSearchParams } from "next/navigation";
import { useMembership } from "@/lib/context/membership-context";
import { isMembershipDiscountEligible } from "@/lib/membership/membership-discount-eligible";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";

/** Effective member discount % for current host (0 on dirtywine.se). */
export function useMembershipDiscountPercent(): number {
  const { discountPercentage, loading } = useMembership();
  const searchParams = useSearchParams();
  const serverHint = useB2BModeServerHint();

  if (loading) {
    return 0;
  }

  const eligible =
    typeof window === "undefined"
      ? !serverHint
      : isMembershipDiscountEligible(
          window.location.hostname,
          searchParams,
        );

  if (!eligible) {
    return 0;
  }

  return discountPercentage;
}
