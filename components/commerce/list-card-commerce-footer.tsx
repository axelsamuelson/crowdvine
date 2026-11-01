"use client";

import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

/**
 * Compact list-card commerce strip: one muted min-6 + direct-box line.
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
  const promise = translate(locale, "commerce.listCardPromiseCompact");

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[10px] leading-tight text-muted-foreground md:text-[11px]">
        {promise}
      </p>
      {children}
    </div>
  );
}
