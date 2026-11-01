"use client";

import type { ReactNode } from "react";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";

/**
 * Renders children on PACT / B2C only. Hidden after Dirty Wine host hydration.
 * Keeps ISR HTML host-neutral (shared CDN cache) without headers() in the shell.
 */
export function B2cOnly({ children }: { children: ReactNode }) {
  const isDirtywine = useB2BModeServerHint();
  if (isDirtywine) return null;
  return <>{children}</>;
}
