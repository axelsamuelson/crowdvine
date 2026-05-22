"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isDirtywineHost } from "@/lib/b2b-site";

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
    typeof window !== "undefined" ? window.location.hostname : "";
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const onB2B = isDirtywineHost(host, searchParams);

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
