"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";

export function BoostBadge({ className }: { className?: string }) {
  const { t } = useTranslations();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 border border-violet-200",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
      {t("shop.boostPoints")}
    </span>
  );
}

/** Reserves overlay space for boosted producers before badge renders. */
export function BoostBadgeSlot({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-0.5 min-h-[18px] md:min-h-[22px]",
        !active && "min-h-0",
        className,
      )}
    >
      {active ? <BoostBadge /> : null}
    </div>
  );
}
