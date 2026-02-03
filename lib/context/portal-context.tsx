"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface PortalContextValue {
  loading: boolean;
  canAccessB2C: boolean;
  canAccessB2B: boolean;
  showPortalToggle: boolean;
  isB2BOnly: boolean;
}

const initial: PortalContextValue = {
  loading: true,
  canAccessB2C: false,
  canAccessB2B: false,
  showPortalToggle: false,
  isB2BOnly: false,
};

const PortalContext = createContext<PortalContextValue | null>(null);

/**
 * Fetches /api/me/portal once and provides portal access state to the tree.
 * Use PortalProvider in root layout so all consumers (prices, header toggle) share one request.
 */
export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PortalContextValue>(initial);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/portal", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setState({
          loading: false,
          canAccessB2C: !!data.canAccessB2C,
          canAccessB2B: !!data.canAccessB2B,
          showPortalToggle: !!data.showPortalToggle,
          isB2BOnly: !!data.isB2BOnly,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ ...initial, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PortalContext.Provider value={state}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalContext(): PortalContextValue | null {
  return useContext(PortalContext);
}
