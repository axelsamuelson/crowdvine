import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Outline badge for Systembolaget ranked cards: launch «NY»/«NEW» only.
 * Movement arrows (↑/↓) stay outside this component. List-«Ny» is not shown.
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
