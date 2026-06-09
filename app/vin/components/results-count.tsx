"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";

interface ResultsCountProps {
  count: number;
  className?: string;
}

export function ResultsCount({ count, className }: ResultsCountProps) {
  const { t } = useTranslations();
  return (
    <span
      className={cn("place-self-center text-sm text-foreground/50", className)}
    >
      {t("shop.results", { count })}
    </span>
  );
}
