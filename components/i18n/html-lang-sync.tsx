"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { htmlLangForPath } from "@/lib/i18n/html-lang";

/**
 * The root layout does not re-render on client navigations, so the server
 * `lang` would otherwise stick to the first document. Rewritten `/en/checkout`
 * also renders the shared `/checkout` tree.
 */
export function HtmlLangSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const lang = htmlLangForPath(pathname);
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }
  }, [pathname]);

  return null;
}
