"use client";

import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { isDirtywineHost } from "@/lib/b2b-site";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";

/**
 * Returns true when we should show prices excluding VAT (B2B mode).
 * - dirtywine.se and localhost with ?b2b=1: B2B
 * - pactwines.com and localhost (default): B2C
 * - Business invite pages (/b/, /ib/): B2B on any host
 * - pactwines.com: B2C (incl. VAT)
 */
export function useB2BPriceMode(): boolean {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const serverHint = useB2BModeServerHint();
  const onBusinessInvite =
    pathname?.startsWith("/b/") || pathname?.startsWith("/ib/");

  const [isB2B, setIsB2B] = useState(() => {
    if (onBusinessInvite) return true;
    return serverHint;
  });

  useEffect(() => {
    if (onBusinessInvite) {
      setIsB2B(true);
      return;
    }
    setIsB2B(isDirtywineHost(window.location.hostname, searchParams));
  }, [searchParams, onBusinessInvite, serverHint]);

  return isB2B;
}
