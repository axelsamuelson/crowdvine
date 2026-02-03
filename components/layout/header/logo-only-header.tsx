"use client";

import Link from "next/link";
import { LogoSvg } from "./logo-svg";

/**
 * Minimal header: only the logo (no menu, cart, profile).
 * Used on tasting and similar pages where full nav should be hidden.
 */
export function LogoOnlyHeader() {
  return (
    <header className="grid fixed top-0 left-0 z-50 grid-cols-3 items-center w-full p-sides md:grid-cols-12 md:gap-sides bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="col-span-full md:col-span-3 xl:col-span-2 flex items-center justify-center md:justify-start">
        <Link href="/" prefetch>
          <LogoSvg className="h-8 md:h-12 w-auto" />
        </Link>
      </div>
    </header>
  );
}
