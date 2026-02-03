"use client";

import { usePortalContext } from "@/lib/context/portal-context";

/**
 * True when we're on the B2B domain (dirtywine.se or localhost without ?b2c=1)
 * and the user has Business access, so prices should be shown exkl. moms.
 * Reads from PortalContext so /api/me/portal is only fetched once for the whole app.
 */
export function useB2BPriceMode(): boolean {
  const portal = usePortalContext();

  if (!portal) {
    return false;
  }

  if (portal.loading) {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  const onB2BProduction = host.includes("dirtywine.se");
  const onLocalhost = host === "localhost" || host === "127.0.0.1";
  const forceB2C = new URLSearchParams(window.location.search).get("b2c") === "1";
  const isB2BDomain = onB2BProduction || (onLocalhost && !forceB2C);

  return isB2BDomain && portal.canAccessB2B;
}
