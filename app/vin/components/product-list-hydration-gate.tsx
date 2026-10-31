"use client";

import {
  startTransition,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useClientMounted } from "@/app/vin/hooks/use-client-mounted";

/**
 * Shows a server-rendered PLP grid until after hydration, then swaps to the
 * interactive client grid (filters, add-to-cart).
 *
 * Important: do NOT render the interactive grid (even hidden) during hydration.
 * Previously both trees hydrated under CSS `hidden`, which produced a ~10s
 * main-thread long task attributed to the shared react-dom chunk under 4x CPU.
 */
export function ProductListHydrationGate({
  staticGrid,
  children,
}: {
  staticGrid: ReactNode;
  children: ReactNode;
}) {
  const mounted = useClientMounted();
  const [showInteractive, setShowInteractive] = useState(false);

  useEffect(() => {
    if (!mounted || showInteractive) return;

    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const reveal = () => {
      startTransition(() => setShowInteractive(true));
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(reveal, { timeout: 800 });
    } else {
      timeoutId = window.setTimeout(reveal, 1);
    }

    return () => {
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [mounted, showInteractive]);

  // Keep a single in-flow tree. Swapping after idle avoids the dual-hydration
  // long task; cards share the same aspect-ratio shell to limit CLS.
  return <>{showInteractive ? children : staticGrid}</>;
}
