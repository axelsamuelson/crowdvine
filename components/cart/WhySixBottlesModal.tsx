"use client";

/**
 * Margaux final: “Varför?” / “Why?” opens a short popover (not a FAQ modal).
 * Kept filename for existing imports.
 */

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "@/lib/hooks/use-translations";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { cn } from "@/lib/utils";

export function WhySixBottlesTrigger({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslations();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={() => {
            AnalyticsTracker.trackEvent({
              eventType: "why_modal_opened",
              eventCategory: "engagement",
            });
          }}
          className={cn(
            "text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors min-h-9 px-1 shrink-0",
            className,
          )}
          title={t("cart.whySixAria")}
          aria-label={t("cart.whySixAria")}
        >
          {t("cart.why")}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="z-[130] w-[min(20rem,calc(100vw-2rem))] text-sm leading-snug text-popover-foreground"
      >
        <p className="text-foreground">{t("cart.whyPopoverBody")}</p>
      </PopoverContent>
    </Popover>
  );
}

/** @deprecated Prefer WhySixBottlesTrigger (popover). Kept for call-site compat. */
export function WhySixBottlesModal({
  isOpen: _isOpen,
  onClose: _onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return null;
}
