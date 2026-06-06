import type { ReactNode } from "react";
import { CasePurchaseHelpTrigger } from "@/components/cart/case-purchase-help-trigger";
import { PeekTabAnchor } from "@/components/pdp/peek-tab-anchor";
import { cn } from "@/lib/utils";

interface WinePdpHeroBoxProps {
  title: string;
  /** Short summary / description for the white box. */
  leadText?: string | null;
  price: React.ReactNode;
  compareAtPrice?: React.ReactNode;
  /** Privilege / Early bird tabs behind the top-left corner of the white box. */
  topLeftBadges?: ReactNode;
  /** Show case-purchase help (?) in bottom-right of the white box. */
  showCaseHelp?: boolean;
  className?: string;
}

/** White box: title + price on top row, full-width description below. */
export function WinePdpHeroBox({
  title,
  leadText,
  price,
  compareAtPrice,
  topLeftBadges,
  showCaseHelp = false,
  className,
}: WinePdpHeroBoxProps) {
  const lead = leadText?.trim();

  return (
    <div
      className={cn(
        "relative overflow-visible",
        topLeftBadges && "mt-5",
      )}
    >
      {topLeftBadges ? (
        <PeekTabAnchor className="left-3 md:left-4">{topLeftBadges}</PeekTabAnchor>
      ) : null}
      <div
        className={cn(
          "relative z-10 rounded-md bg-popover px-3 py-3 md:grid md:min-h-[9.5rem] md:grid-cols-2 md:gap-x-4 md:gap-y-4 md:px-4 md:py-5",
          className,
        )}
      >
        <h1 className="max-md:mb-1 text-balance text-lg font-semibold text-foreground md:col-start-1 md:row-start-1 lg:text-xl 2xl:text-2xl">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 max-md:mt-4 md:col-start-2 md:row-start-1 md:justify-self-end md:self-start">
          {price}
          {compareAtPrice}
        </div>

        {lead ? (
          <p className="text-sm font-medium max-md:mt-3 md:col-span-2 md:row-start-2 md:w-full md:pt-1">
            {lead}
          </p>
        ) : null}

        {showCaseHelp ? (
          <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4">
            <CasePurchaseHelpTrigger variant="plain" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
