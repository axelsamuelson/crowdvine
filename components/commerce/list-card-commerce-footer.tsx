"use client";

import { MinSixBottlesHint } from "@/components/commerce/min-six-bottles-hint";
import { PalletStatusSnapshot } from "@/components/commerce/pallet-status-snapshot";
import type { AppLocale } from "@/lib/i18n/locale";
import type { ZoneStatusPayload } from "@/lib/pallet/zone-status";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

/**
 * Shared list-card commerce strip: min-6 hint + compact pallet fill.
 */
export function ListCardCommerceFooter({
  palletStatus,
  className,
  children,
}: {
  palletStatus?: ZoneStatusPayload | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const { context } = useTranslations();
  const locale = (context.locale ?? "sv") as AppLocale;

  return (
    <div className={cn("space-y-1.5", className)}>
      <MinSixBottlesHint locale={locale} compact />
      {palletStatus ? (
        <PalletStatusSnapshot status={palletStatus} locale={locale} compact />
      ) : null}
      {children}
    </div>
  );
}
