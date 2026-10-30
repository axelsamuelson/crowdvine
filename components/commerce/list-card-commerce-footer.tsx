"use client";

import { DirectBoxDeliveryPromise } from "@/components/commerce/direct-box-delivery-promise";
import { MinSixBottlesHint } from "@/components/commerce/min-six-bottles-hint";
import type { AppLocale } from "@/lib/i18n/locale";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

/**
 * Shared list-card commerce strip: min-6 hint + direct-box delivery promise.
 * No customer-facing pallet fill.
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

  return (
    <div className={cn("space-y-1.5", className)}>
      <MinSixBottlesHint locale={locale} compact />
      <DirectBoxDeliveryPromise locale={locale} compact />
      {children}
    </div>
  );
}
