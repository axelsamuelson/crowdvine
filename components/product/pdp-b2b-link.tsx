"use client";

import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import type { AppLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const DIRTYWINE_ORIGIN = "https://dirtywine.se";

const COPY: Record<AppLocale, { label: string; hint: string }> = {
  sv: {
    label: "För företag",
    hint: "Öppna samma vin på Dirty Wine (B2B)",
  },
  en: {
    label: "For business",
    hint: "Open this wine on Dirty Wine (B2B)",
  },
};

type Props = {
  locale?: AppLocale;
  className?: string;
  /**
   * `footer` — secondary inverted chrome for the site footer (PACT only).
   * Default keeps the quieter PDP / light-surface style.
   */
  variant?: "default" | "footer";
};

/**
 * Quiet B2C → B2B escape hatch. Lives in the PACT site footer (secondary),
 * not next to the primary buy CTA.
 */
export function PdpB2BLink({
  locale = "en",
  className,
  variant = "default",
}: Props) {
  const isB2B = useB2BModeServerHint();
  const pathname = usePathname();

  if (isB2B || !pathname) return null;

  const copy = COPY[locale] ?? COPY.en;
  const href = `${DIRTYWINE_ORIGIN}${pathname}`;
  const isFooter = variant === "footer";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={copy.hint}
      aria-label={copy.hint}
      data-testid="pact-foretag-link"
      className={cn(
        "group inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm transition-colors",
        isFooter
          ? "text-background/50 hover:text-background"
          : "text-stone-500 hover:text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "underline underline-offset-4",
          isFooter
            ? "decoration-background/25 group-hover:decoration-background/50"
            : "decoration-stone-300 group-hover:decoration-foreground/40",
        )}
      >
        {copy.label}
      </span>
      <ArrowUpRight
        className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </a>
  );
}
