"use client";

import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { cn } from "@/lib/utils";

/**
 * Early reminder of the 6-bottle minimum (mix allowed).
 * Hidden on Dirty Wine after client host hydration (ISR shell is host-neutral).
 */
export function MinSixBottlesHint({
  locale = "sv",
  className,
  compact = false,
}: {
  locale?: AppLocale;
  className?: string;
  compact?: boolean;
}) {
  const isDirtywine = useB2BModeServerHint();
  if (isDirtywine) return null;

  const text = translate(locale, "commerce.minSixMix");
  return (
    <p
      className={cn(
        "text-muted-foreground",
        compact ? "text-[10px] leading-tight md:text-xs" : "text-sm",
        className,
      )}
    >
      {text}
    </p>
  );
}
