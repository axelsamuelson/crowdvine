import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared outline badge for Systembolaget ranked cards:
 * launch «NY»/«NEW» and list-«Ny»/«New» use the same mark.
 * Movement arrows (↑/↓) stay outside this component.
 */
export function SystembolagetRankStatusBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border border-foreground px-1 py-0.5 text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
