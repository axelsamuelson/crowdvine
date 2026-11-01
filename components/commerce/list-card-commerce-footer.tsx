"use client";

import { DirectBoxDeliveryPromise } from "@/components/commerce/direct-box-delivery-promise";
import { MinSixBottlesHint } from "@/components/commerce/min-six-bottles-hint";
import type { AppLocale } from "@/lib/i18n/locale";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { cn } from "@/lib/utils";

/**
 * Shared list-card commerce strip: min-6 hint (PACT only) + direct-box delivery promise.
 * Dirty Wine (restaurants) has no bottle minimum — hide the min-6 line there.
 */
export function ListCardCommerceFooter({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { context } = useTranslations();
  const locale = (context.locale ?? "sv") as AppLocale;
  const isB2B = useB2BPriceMode();

  return (
    <div className={cn("space-y-1.5", className)}>
      {!isB2B ? <MinSixBottlesHint locale={locale} compact /> : null}
      <DirectBoxDeliveryPromise locale={locale} compact />
      {children}
    </div>
  );
}
