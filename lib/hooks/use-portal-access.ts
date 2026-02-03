"use client";

import { useEffect, useState } from "react";

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

export function usePortalAccess(): PortalAccessState {
  const [state, setState] = useState<PortalAccessState>(initial);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetch("/api/me/portal", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : initial))
      .then((data) => {
        if (cancelled) return;
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

  return state;
}
