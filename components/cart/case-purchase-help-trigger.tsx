"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";

export function CasePurchaseHelpTrigger({ className }: { className?: string }) {
  const { t } = useTranslations();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[0.5px] border-black/15 text-xs font-semibold text-[color:var(--color-text-secondary,hsl(var(--muted-foreground)))] transition-colors hover:bg-black/5 hover:text-foreground",
            className,
          )}
          style={{
            background:
              "var(--color-background-secondary, hsl(var(--secondary)))",
          }}
          aria-label={t("cart.caseHelpAria")}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="z-[130] w-[min(20rem,calc(100vw-2rem))] space-y-3 text-sm leading-snug text-popover-foreground"
      >
        <p className="font-semibold text-foreground">{t("cart.caseHelpTitle")}</p>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{t("cart.caseHelpSameTitle")}</p>
          <p className="text-muted-foreground">{t("cart.caseHelpSameBody")}</p>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{t("cart.caseHelpMixedTitle")}</p>
          <p className="text-muted-foreground">{t("cart.caseHelpMixedBody")}</p>
        </div>
        <div className="space-y-1 border-t border-border pt-3">
          <p className="font-medium text-foreground">{t("cart.caseHelpSingleTitle")}</p>
          <p className="text-muted-foreground">{t("cart.caseHelpSingleBody")}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
