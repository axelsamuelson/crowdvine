"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMembership } from "@/lib/context/membership-context";
import { isMembershipDiscountEligible } from "@/lib/membership/membership-discount-eligible";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";

/** Effective member discount % for current host (0 on dirtywine.se). */
export function useMembershipDiscountPercent(): number {
  const { discountPercentage, loading } = useMembership();
  const pathname = usePathname();
  const serverHint = useB2BModeServerHint();
  const [eligible, setEligible] = useState(() => !serverHint);

  useEffect(() => {
    setEligible(
      isMembershipDiscountEligible(
        window.location.hostname,
        new URLSearchParams(window.location.search),
      ),
    );
  }, [pathname, serverHint]);

  if (loading || !eligible) {
    return 0;
  }

  return discountPercentage;
}
