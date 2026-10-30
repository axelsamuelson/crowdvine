import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * Early, always-visible reminder of the 6-bottle minimum (mix allowed).
 * Server-rendered so it shows without client JS.
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
