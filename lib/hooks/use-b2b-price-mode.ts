"use client";

import { useState, useEffect } from "react";

/**
 * True when the user is Business and we're on the B2B domain (dirtywine.se),
 * so prices should be shown exkl. moms.
 */
export function useB2BPriceMode(): boolean {
  const [showExclVat, setShowExclVat] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    const onB2BProduction = host.includes("dirtywine.se");
    const onLocalhost = host === "localhost" || host === "127.0.0.1";
    const forceB2C = new URLSearchParams(window.location.search).get("b2c") === "1";
    const isB2BDomain = onB2BProduction || (onLocalhost && !forceB2C);

    let cancelled = false;
    setShowExclVat(false);

    if (!isB2BDomain) {
      return;
    }

    fetch("/api/me/portal", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setShowExclVat(!!data?.canAccessB2B);
      })
      .catch(() => {
        if (!cancelled) setShowExclVat(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return showExclVat;
}
