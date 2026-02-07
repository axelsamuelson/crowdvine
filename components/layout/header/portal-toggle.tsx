"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PACT_ORIGIN = "https://pactwines.com";
const B2B_ORIGIN = "https://dirtywine.se";

interface PortalToggleProps {
  showPortalToggle?: boolean;
  className?: string;
}

export function PortalToggle({ showPortalToggle, className }: PortalToggleProps) {
  const pathname = usePathname();

  if (!showPortalToggle) return null;

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const forceB2B =
    typeof window !== "undefined" ? window.location.search.includes("b2b=1") : false;
  const onLocalhost = host === "localhost" || host === "127.0.0.1";
  // dirtywine.se = B2B. localhost + ?b2b=1 = B2B. localhost (default) = PACT
  const onB2B = host.includes("dirtywine.se") || (onLocalhost && forceB2B);

  const handleSwitch = () => {
    const targetOrigin = onB2B ? PACT_ORIGIN : B2B_ORIGIN;
    const target = `${targetOrigin}${pathname ?? ""}${window.location.search}`;
    window.location.href = target;
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className={cn(
        "text-xs font-medium uppercase text-foreground/70 hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-foreground/30",
        className,
      )}
    >
      {onB2B ? "PACT" : "Dirty Wine"}
    </button>
  );
}
