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
    const search = window.location.search ?? "";
    const isB2B = window.location.hostname.toLowerCase().includes("dirtywine.se");
    const origin = window.location.origin;
    const pathEnc = encodeURIComponent(path);
    const searchEnc = encodeURIComponent(search);
    if (isB2B) {
      return {
        currentPortal: "b2b" as const,
        b2cUrl: `${origin}/api/auth/cross-domain?path=${pathEnc}&search=${searchEnc}&target=${encodeURIComponent(B2C_ORIGIN)}`,
        b2bUrl: `${B2B_ORIGIN}${path}${search}`,
      };
    }
    return {
      currentPortal: "b2c" as const,
      b2cUrl: `${B2C_ORIGIN}${path}${search}`,
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
