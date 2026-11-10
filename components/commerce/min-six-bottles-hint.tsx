"use client";

import { useEffect, useRef } from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { emitOnce } from "@/lib/analytics/emit-once";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export type SixPackRuleSurface = "pdp_info" | "first_add" | "cart";

/**
 * Early, always-visible reminder of the 6-bottle minimum (mix allowed).
 * Code rule: B2C cart-total floor ≥ 6 (not whole boxes of 6).
 */
export function MinSixBottlesHint({
  locale = "sv",
  className,
  compact = false,
  /** When set, fire six_pack_rule_viewed once for this surface. */
  trackSurface,
}: {
  locale?: AppLocale;
  className?: string;
  compact?: boolean;
  trackSurface?: SixPackRuleSurface;
}) {
  const text = translate(locale, "commerce.minSixMix");
  const tracked = useRef(false);

  useEffect(() => {
    if (!trackSurface || tracked.current) return;
    tracked.current = true;
    emitOnce(`six_pack_rule_viewed:${trackSurface}`, () => {
      void AnalyticsTracker.trackEvent({
        eventType: "six_pack_rule_viewed",
        eventCategory: "engagement",
        metadata: { surface: trackSurface },
      });
    });
  }, [trackSurface]);

  return (
    <p
      className={cn(
        "text-muted-foreground",
        compact ? "text-[10px] leading-tight md:text-xs" : "text-sm",
        className,
      )}
      data-six-pack-rule={trackSurface ?? "hint"}
    >
      {text}
    </p>
  );
}
