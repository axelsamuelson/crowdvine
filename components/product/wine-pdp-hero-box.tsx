import type { ReactNode } from "react";
import Link from "next/link";
import { CasePurchaseHelpTrigger } from "@/components/cart/case-purchase-help-trigger";
import { PeekTabAnchor } from "@/components/pdp/peek-tab-anchor";
import type { AppLocale } from "@/lib/i18n/locale";
import { producerPublicPath } from "@/lib/i18n/localized-routes";
import { producerDisplayName } from "@/lib/producer-display-name";
import { cn } from "@/lib/utils";

interface WinePdpHeroBoxProps {
  title: string;
  /** Short summary / description for the white box. */
  leadText?: string | null;
  producerName?: string | null;
  producerDisplayName?: string | null;
  producerSlug?: string | null;
  locale?: AppLocale;
  price: React.ReactNode;
  compareAtPrice?: React.ReactNode;
  /** Hero tabs behind the top-left corner (early bird / privilege on PACT, stock on Dirty Wine). */
  topLeftBadges?: ReactNode;
  /** Show case-purchase help (?) in bottom-right of the white box. */
  showCaseHelp?: boolean;
  className?: string;
}

const UNKNOWN_PRODUCER_LABEL = "Unknown Producer";

/** White box: title + price on top row, full-width description below. */
export function WinePdpHeroBox({
  title,
  leadText,
  producerName,
  producerDisplayName: producerDisplayNameValue,
  producerSlug,
  locale = "en",
  price,
  compareAtPrice,
  topLeftBadges,
  showCaseHelp = false,
  className,
}: WinePdpHeroBoxProps) {
  const lead = leadText?.trim();
  const legalProducerName = producerName?.trim() ?? "";
  const shownProducerName = producerDisplayName({
    name: legalProducerName,
    display_name: producerDisplayNameValue,
  });
  const showLegalName =
    Boolean(legalProducerName) &&
    legalProducerName !== UNKNOWN_PRODUCER_LABEL &&
    shownProducerName.toLowerCase() !== legalProducerName.toLowerCase();
  const showProducerByline =
    Boolean(producerSlug?.trim()) &&
    Boolean(shownProducerName) &&
    shownProducerName !== UNKNOWN_PRODUCER_LABEL;
  const leadRowStart = showProducerByline ? "md:row-start-3" : "md:row-start-2";

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
          "relative z-10 rounded-md bg-popover px-3 py-3 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-3 md:px-4 md:py-4",
          // Reserve height only when lead copy fills the box — avoid empty band under the producer.
          lead ? "md:min-h-[9.5rem]" : null,
          className,
        )}
      >
        <h1 className="max-md:mb-1 text-balance text-lg font-semibold text-foreground md:col-start-1 md:row-start-1 lg:text-xl 2xl:text-2xl">
          {title}
        </h1>

        {showProducerByline ? (
          <div className="max-md:mt-1 md:col-start-1 md:row-start-2">
            <Link
              href={producerPublicPath(producerSlug!, locale)}
              className="text-sm text-stone-600 underline underline-offset-2 hover:text-foreground"
            >
              {shownProducerName}
            </Link>
            {showLegalName ? (
              <p className="mt-0.5 text-xs text-stone-500">{legalProducerName}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 max-md:mt-3 md:col-start-2 md:row-start-1 md:justify-self-end md:self-start">
          {price}
          {compareAtPrice}
          {/* Inline with price so the title box stays tight when there is no lead copy. */}
          {showCaseHelp ? <CasePurchaseHelpTrigger variant="plain" /> : null}
        </div>

        {lead ? (
          <p
            className={cn(
              "text-sm font-medium max-md:mt-3 md:col-span-2 md:w-full md:pt-1",
              leadRowStart,
            )}
          >
            {lead}
          </p>
        ) : null}
      </div>
    </div>
  );
}
