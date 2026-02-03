"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const B2C_ORIGIN = "https://pactwines.com";
const B2B_ORIGIN = "https://dirtywine.se";

interface PortalToggleProps {
  showPortalToggle: boolean;
  className?: string;
}

export function PortalToggle({ showPortalToggle, className }: PortalToggleProps) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { currentPortal, b2cUrl, b2bUrl } = useMemo(() => {
    if (!isClient || typeof window === "undefined")
      return { currentPortal: "b2c" as const, b2cUrl: "#", b2bUrl: "#" };
    const path = pathname ?? window.location.pathname;
    const rawSearch = window.location.search ?? "";
    const host = window.location.hostname.toLowerCase();
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    const isB2BProduction = host.includes("dirtywine.se");
    const origin = window.location.origin;
    const pathEnc = encodeURIComponent(path);
    const searchEnc = encodeURIComponent(rawSearch);

    const params = new URLSearchParams(rawSearch);
    const forceB2C = params.get("b2c") === "1";
    const currentPortalLocal = isB2BProduction || (isLocalhost && !forceB2C) ? "b2b" : "b2c";

    if (isLocalhost) {
      const searchForB2C = new URLSearchParams(params);
      searchForB2C.set("b2c", "1");
      const b2cSearch = `?${searchForB2C.toString()}`;
      const searchForB2B = new URLSearchParams(params);
      searchForB2B.delete("b2c");
      const b2bSearch = searchForB2B.toString() ? `?${searchForB2B.toString()}` : "";
      return {
        currentPortal: currentPortalLocal,
        b2cUrl: `${origin}${path}${b2cSearch}`,
        b2bUrl: `${origin}${path}${b2bSearch}`,
      };
    }

    if (isB2BProduction) {
      return {
        currentPortal: "b2b" as const,
        b2cUrl: `${origin}/api/auth/cross-domain?path=${pathEnc}&search=${searchEnc}&target=${encodeURIComponent(B2C_ORIGIN)}`,
        b2bUrl: `${B2B_ORIGIN}${path}${rawSearch}`,
      };
    }
    return {
      currentPortal: "b2c" as const,
      b2cUrl: `${B2C_ORIGIN}${path}${rawSearch}`,
      b2bUrl: `${origin}/api/auth/cross-domain?path=${pathEnc}&search=${searchEnc}&target=${encodeURIComponent(B2B_ORIGIN)}`,
    };
  }, [pathname, isClient]);

  if (!showPortalToggle || !isClient) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/50 p-0.5 text-xs font-medium uppercase tracking-wide",
        className,
      )}
      role="group"
      aria-label="Växla portal (B2C / B2B)"
    >
      <a
        href={b2cUrl}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          currentPortal === "b2c"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={currentPortal === "b2c" ? "true" : undefined}
      >
        PACT
      </a>
      <span className="text-muted-foreground/60 px-0.5" aria-hidden>
        |
      </span>
      <a
        href={b2bUrl}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          currentPortal === "b2b"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={currentPortal === "b2b" ? "true" : undefined}
      >
        DIRTY WINE
      </a>
    </div>
  );
}
