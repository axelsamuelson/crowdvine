"use client";

import { usePortalContext } from "@/lib/context/portal-context";

export interface PortalAccessState {
  loading: boolean;
  canAccessB2C: boolean;
  canAccessB2B: boolean;
  showPortalToggle: boolean;
  isB2BOnly: boolean;
}

const initial: PortalAccessState = {
  loading: true,
  canAccessB2C: false,
  canAccessB2B: false,
  showPortalToggle: false,
  isB2BOnly: false,
};

/**
 * Returns portal access state from PortalContext (single shared fetch).
 * Use only inside PortalProvider (e.g. root layout).
 */
export function usePortalAccess(): PortalAccessState {
  const context = usePortalContext();
  return context ?? initial;
}
