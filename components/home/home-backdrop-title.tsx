import Image from "next/image";
import Link from "next/link";
import { BadgePercent, Handshake, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BackdropCta = {
  href: string;
  label: string;
};

export type BackdropHighlight = {
  label: string;
  tone: "emerald" | "amber" | "sky";
};

const HIGHLIGHT_ICONS: Record<BackdropHighlight["tone"], LucideIcon> = {
  emerald: BadgePercent,
  amber: Truck,
  sky: Handshake,
};

const HIGHLIGHT_ICON_CLASS: Record<BackdropHighlight["tone"], string> = {
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
};

/** Product-grid tile: a background photo with a title on top, not a wine. */
export function HomeBackdropTitle({
  src,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  highlights,
  className,
}: {
  src: string;
  title: string;
  subtitle?: string;
  primaryCta?: BackdropCta;
  secondaryCta?: BackdropCta;
  highlights?: BackdropHighlight[];
  className?: string;
}) {
  const ctaClassName =
    "inline-flex h-11 min-w-[10rem] items-center justify-center rounded-full px-6 text-sm font-medium transition-colors";

  return (
    <div className={cn("relative min-h-fold overflow-hidden", className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 66vw"
        className="object-cover object-[70%_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/25 to-black/35" />
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center p-sides",
          highlights && highlights.length > 0 && "pb-28 sm:pb-32",
        )}
      >
        <div className="max-w-3xl text-center text-white">
          <h2 className="text-3xl font-semibold leading-[0.95] tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              {subtitle}
            </p>
          ) : null}
          {primaryCta || secondaryCta ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {primaryCta ? (
                <Link
                  href={primaryCta.href}
                  prefetch
                  className={cn(ctaClassName, "bg-white text-stone-900 hover:bg-white/90")}
                >
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link
                  href={secondaryCta.href}
                  prefetch
                  className={cn(
                    ctaClassName,
                    "border border-white/80 bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {highlights && highlights.length > 0 ? (
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5">
          <ul className="mx-auto flex max-w-3xl flex-row items-center justify-between gap-2 rounded-[1.75rem] border border-white/15 bg-neutral-950/50 px-3 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:gap-6 sm:px-7 sm:py-5">
            {highlights.map((item) => {
              const Icon = HIGHLIGHT_ICONS[item.tone];
              return (
                <li key={item.label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                  <Icon
                    className={cn(
                      "size-4 shrink-0 sm:size-6",
                      HIGHLIGHT_ICON_CLASS[item.tone],
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="text-left text-[11px] font-semibold leading-tight text-white sm:text-base">
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
