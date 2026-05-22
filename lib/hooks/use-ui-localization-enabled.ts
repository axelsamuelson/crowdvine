"use client";

import { useSearchParams } from "next/navigation";
import { isUiLocalizationEnabled } from "@/lib/localization";

/** False on dirtywine.se / localhost B2B — hides language UI. */
export function useUiLocalizationEnabled(): boolean {
  const searchParams = useSearchParams();
  if (typeof window === "undefined") return true;
  return isUiLocalizationEnabled(window.location.hostname, searchParams);
}
