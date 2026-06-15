"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  pathnameNeedsVaulDrawerWrapper,
  VAUL_DRAWER_WRAPPER_ID,
} from "@/lib/vaul-drawer-routes";

/** Keeps the server-rendered vaul wrapper attribute in sync after client navigations. */
export function VaulDrawerAttributeSync({
  ssrPathname,
}: {
  ssrPathname: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.getElementById(VAUL_DRAWER_WRAPPER_ID);
    if (!el) return;

    const needsWrapper = pathnameNeedsVaulDrawerWrapper(pathname || ssrPathname);
    if (needsWrapper) {
      el.setAttribute("data-vaul-drawer-wrapper", "true");
    } else {
      el.removeAttribute("data-vaul-drawer-wrapper");
    }
  }, [pathname, ssrPathname]);

  return null;
}
