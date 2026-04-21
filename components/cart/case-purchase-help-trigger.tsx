"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CasePurchaseHelpTrigger({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[0.5px] border-black/15 text-xs font-semibold text-[color:var(--color-text-secondary,hsl(var(--muted-foreground)))] transition-colors hover:bg-black/5 hover:text-foreground",
            className,
          )}
          style={{
            background:
              "var(--color-background-secondary, hsl(var(--secondary)))",
          }}
          aria-label="How same and mixed cases work"
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="z-[130] w-[min(20rem,calc(100vw-2rem))] space-y-3 text-sm leading-snug text-popover-foreground"
      >
        <p className="font-semibold text-foreground">Buying by the case (6 bottles)</p>
        <div className="space-y-1">
          <p className="font-medium text-foreground">× 6 same</p>
          <p className="text-muted-foreground">
            Six bottles of the exact same wine and vintage—one full case when you
            know what you want at home.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">× 6 mixed</p>
          <p className="text-muted-foreground">
            You choose six bottles from the producer&apos;s range in the mixed-case
            flow (based on what&apos;s available), so you can vary what&apos;s in the box.
          </p>
        </div>
        <div className="space-y-1 border-t border-border pt-3">
          <p className="font-medium text-foreground">Why not a single bottle?</p>
          <p className="text-muted-foreground">
            These wines are sold in full cases to keep shipping, handling, and
            environmental impact per bottle lower. The minimum purchase is therefore
            six bottles.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
