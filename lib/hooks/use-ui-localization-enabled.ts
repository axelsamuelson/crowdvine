"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isUiLocalizationEnabled } from "@/lib/localization";

/** False on dirtywine.se / localhost B2B — hides language UI. */
export function useUiLocalizationEnabled(): boolean {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(
      isUiLocalizationEnabled(
        window.location.hostname,
        new URLSearchParams(window.location.search),
      ),
    );
  }, [pathname]);

  return enabled;
}
