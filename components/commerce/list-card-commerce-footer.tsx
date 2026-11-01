"use client";

import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

/**
 * Compact list-card commerce strip: one muted min-6 + direct-box line.
 * Spec: ≥11px, #737373.
 */
export function ListCardCommerceFooter({
  className,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { context } = useTranslations();
  const locale = (context.locale ?? "sv") as AppLocale;
  const promise = translate(locale, "commerce.listCardPromiseCompact");

  return (
    <p
      className={cn(
        "truncate text-[11px] leading-none text-[#737373]",
        className,
      )}
    >
      {promise}
    </p>
  );
}
