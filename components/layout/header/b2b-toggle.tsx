"use client";

import { useB2B } from "@/lib/context/b2b-context";
import { cn } from "@/lib/utils";

export function B2BToggle() {
  const { isB2BMode, toggleB2BMode, canToggle } = useB2B();

  // Debug logging
  console.log("[B2BToggle] canToggle:", canToggle, "isB2BMode:", isB2BMode);

  if (!canToggle) {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5 ml-3">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleB2BMode();
        }}
        className={cn(
          "px-2 py-1 text-xs font-semibold uppercase transition-colors duration-200",
          !isB2BMode
            ? "text-foreground"
            : "text-foreground/50 hover:text-foreground"
        )}
        aria-label="Switch to private mode"
      >
        PRIVATE
      </button>
      <span className="text-foreground/30">/</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleB2BMode();
        }}
        className={cn(
          "px-2 py-1 text-xs font-semibold uppercase transition-colors duration-200",
          isB2BMode
            ? "text-foreground"
            : "text-foreground/50 hover:text-foreground"
        )}
        aria-label="Switch to business mode"
      >
        BUSINESS
      </button>
    </div>
  );
}
