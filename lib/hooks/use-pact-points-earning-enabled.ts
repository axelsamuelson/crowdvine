"use client";

import { useEffect, useState } from "react";
import { parsePactPointsEarningEnabled } from "@/lib/membership/pact-points-earning-parse";

/**
 * Client read of `pact_points_earning_enabled` (default OFF when missing).
 * Used to hide earn-points UI (boost badge, how-to-earn, etc.).
 */
export function usePactPointsEarningEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/site-content/pact_points_earning_enabled?t=${Date.now()}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { value?: string };
        if (!cancelled) {
          setEnabled(parsePactPointsEarningEnabled(data.value));
        }
      } catch {
        // default OFF
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
