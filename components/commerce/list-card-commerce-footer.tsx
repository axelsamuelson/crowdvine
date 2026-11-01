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
    <div className={cn(children ? "flex flex-col gap-1" : null, className)}>
      <p className="truncate text-[10px] leading-none text-muted-foreground">
        {promise}
      </p>
      {children}
    </div>
  );
}
