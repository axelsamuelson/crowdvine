"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isDirtywineHost } from "@/lib/b2b-site";

/**
 * Client-side dirtywine detection. Pass `serverHint` from SSR when available
 * to avoid hydration mismatch.
 *
 * Avoids useSearchParams() so static/ISR pages do not require a Suspense boundary.
 */
export function useIsDirtywineSite(serverHint?: boolean): boolean {
  const pathname = usePathname();
  const [isDirtywine, setIsDirtywine] = useState(
    () => serverHint ?? false,
  );

  useEffect(() => {
    setIsDirtywine(
      isDirtywineHost(
        window.location.hostname,
        new URLSearchParams(window.location.search),
      ),
    );
  }, [pathname, serverHint]);

  return isDirtywine;
}
