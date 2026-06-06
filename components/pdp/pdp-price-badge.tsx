import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PdpPriceBadgeProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** When true, skip default black background (use className/style for color). */
  customAppearance?: boolean;
}

/** Tab-style badge that peeks above the PDP hero box (flat bottom edge). */
export const pdpHeroTabBadgeClass =
  "inline-flex w-auto min-h-[1.625rem] shrink-0 items-start rounded-t-md rounded-b-none px-2.5 pt-1 pb-2.5 text-[10px] font-medium leading-snug shadow-none";

/** How much of the tab sits behind the hero box top edge (px). */
export const pdpHeroTabOverlapPx = 8;

/** Pill badge — default black; membership tabs pass level colors via className. */
export function PdpPriceBadge({
  children,
  className,
  style,
  customAppearance = false,
}: PdpPriceBadgeProps) {
  return (
    <span
      className={cn(
        "box-border w-full min-w-0 rounded-md px-2 py-0.5 text-center text-[10px] font-medium leading-tight",
        customAppearance ? "text-white" : "bg-black text-white",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
