"use client";

import { useSearchParams, usePathname } from "next/navigation";

/**
 * Returns true when we should show prices excluding VAT (B2B mode).
 * - dirtywine.se: always B2B
 * - localhost with ?b2b=1: B2B
 * - Business invite pages (/b/, /ib/): B2B (business inbjudan = priser exkl. moms)
 * - pactwines.com / localhost without b2b: B2C (incl. VAT)
 */
export function useB2BPriceMode(): boolean {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const forceB2B = searchParams.get("b2b") === "1";

  if (typeof window === "undefined") {
    return false;
  }
  const host = window.location.hostname.toLowerCase();
  const onB2BProduction = host.includes("dirtywine.se");
  const onLocalhost = host === "localhost" || host === "127.0.0.1";
  const onBusinessInvite = pathname?.startsWith("/b/") || pathname?.startsWith("/ib/");
  const localAsDirtywine =
    process.env.NEXT_PUBLIC_LOCAL_AS_DIRTYWINE === "1";

  return (
    onB2BProduction ||
    (onLocalhost && (forceB2B || localAsDirtywine)) ||
    !!onBusinessInvite
  );
}
