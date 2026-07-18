"use client";

import { useEffect } from "react";
import { ensureInternalDeviceFromAdmin } from "@/lib/analytics/internal-device";

/**
 * When an admin session is detected (same /api/me/admin check as /admin),
 * set pact_internal_device once so subsequent storefront browsing is tagged.
 */
export function InternalDeviceMarker() {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/me/admin");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.isAdmin === true) {
          ensureInternalDeviceFromAdmin();
        }
      } catch {
        // ignore
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
