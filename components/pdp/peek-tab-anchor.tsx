import type { ReactNode } from "react";
import { pdpHeroTabOverlapPx } from "@/components/pdp/pdp-price-badge";
import { cn } from "@/lib/utils";

/** Positions tab badges so they peek above a container's top edge (behind z-10 content). */
export function PeekTabAnchor({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 z-0 flex flex-wrap gap-1",
        className,
      )}
      style={{
        transform: `translateY(calc(-100% + ${pdpHeroTabOverlapPx}px))`,
      }}
    >
      {children}
    </div>
  );
}
