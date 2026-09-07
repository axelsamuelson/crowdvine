"use client";

import type { ReactNode } from "react";

import { useClientMounted } from "@/app/vin/hooks/use-client-mounted";

/**
 * Shows a server-rendered PLP grid until hydration, then swaps to the
 * interactive client grid (filters, add-to-cart). Keeps LCP images in HTML.
 */
export function ProductListHydrationGate({
  staticGrid,
  children,
}: {
  staticGrid: ReactNode;
  children: ReactNode;
}) {
  const mounted = useClientMounted();

  return (
    <>
      <div
        className={mounted ? "hidden" : undefined}
        aria-hidden={mounted || undefined}
      >
        {staticGrid}
      </div>
      <div className={!mounted ? "hidden" : undefined}>{children}</div>
    </>
  );
}
