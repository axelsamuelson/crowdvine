import Link from "next/link";

import {
  TERMS_SECTION_SELLER_ID,
  TERMS_SECTION_WITHDRAWAL_ID,
  termsSectionHref,
} from "@/lib/commerce/terms-section-href";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * PACT-only seller / consumer disclosure near price + buy (PDP) or once on /vin.
 * Same visual weight as DirectBoxDeliveryPromise (text-sm muted).
 */
export function PactSellerConsumerInfo({
  locale = "sv",
  className,
  showSeller = true,
  showWithdrawal = true,
  showSharedPallet = true,
  compact = false,
}: {
  locale?: AppLocale;
  className?: string;
  showSeller?: boolean;
  showWithdrawal?: boolean;
  showSharedPallet?: boolean;
  compact?: boolean;
}) {
  const textClass = cn(
    "text-muted-foreground",
    compact ? "text-[10px] leading-tight md:text-xs" : "text-sm",
  );
  const linkClass = cn(
    textClass,
    "underline underline-offset-4 hover:text-foreground",
  );

  return (
    <div
      className={cn("w-full min-w-0 space-y-2", className)}
      data-pact-seller-consumer-info
    >
      {showSeller ? (
        <p className={textClass}>
          <Link
            href={termsSectionHref(locale, TERMS_SECTION_SELLER_ID)}
            className={linkClass}
            data-testid="pact-seller-line"
          >
            {translate(locale, "commerce.sellerLine")}
          </Link>
        </p>
      ) : null}
      {showWithdrawal ? (
        <p className={textClass}>
          <Link
            href={termsSectionHref(locale, TERMS_SECTION_WITHDRAWAL_ID)}
            className={linkClass}
            data-testid="pact-withdrawal-line"
          >
            {translate(locale, "commerce.withdrawalLine")}
          </Link>
        </p>
      ) : null}
      {showSharedPallet ? (
        <p className={textClass} data-testid="pact-shared-pallet-line">
          {translate(locale, "commerce.sharedPalletDelivery")}
        </p>
      ) : null}
    </div>
  );
}
