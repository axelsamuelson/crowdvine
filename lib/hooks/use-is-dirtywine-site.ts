"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isDirtywineHost } from "@/lib/b2b-site";

/**
 * Client-side dirtywine detection. Pass `serverHint` from SSR when available
 * to avoid hydration mismatch.
 */
export function useIsDirtywineSite(serverHint?: boolean): boolean {
  const searchParams = useSearchParams();
  const [isDirtywine, setIsDirtywine] = useState(
    () => serverHint ?? false,
  );

  useEffect(() => {
    setIsDirtywine(
      isDirtywineHost(window.location.hostname, searchParams),
    );
  }, [searchParams]);

  return isDirtywine;
}
