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
