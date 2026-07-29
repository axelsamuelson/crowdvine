"use client";

import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import type { AppLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const DIRTYWINE_ORIGIN = "https://dirtywine.se";

const COPY: Record<
  AppLocale,
  { label: string; hint: string }
> = {
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
};

/**
 * Quiet B2C → B2B escape hatch. Lives under primary purchase actions —
 * not next to consumer price — so it doesn’t compete with buy intent.
 */
export function PdpB2BLink({ locale = "en", className }: Props) {
  const isB2B = useB2BModeServerHint();
  const pathname = usePathname();

  if (isB2B || !pathname) return null;

  const copy = COPY[locale] ?? COPY.en;
  const href = `${DIRTYWINE_ORIGIN}${pathname}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={copy.hint}
      aria-label={copy.hint}
      className={cn(
        "group inline-flex items-center gap-1 text-sm text-stone-500 transition-colors",
        "hover:text-foreground",
        className,
      )}
    >
      <span className="underline underline-offset-4 decoration-stone-300 group-hover:decoration-foreground/40">
        {copy.label}
      </span>
      <ArrowUpRight
        className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </a>
  );
}
