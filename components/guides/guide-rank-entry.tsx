import type { ReactNode } from "react";
import Link from "next/link";

type GuideRankEntryProps = {
  rank: number;
  title: string;
  meta: string;
  description?: ReactNode;
  compact?: boolean;
  href?: string;
  rankNote?: ReactNode;
};

export function GuideRankEntry({
  rank,
  title,
  meta,
  description,
  compact = false,
  href,
  rankNote,
}: GuideRankEntryProps) {
  return (
    <article
      className={
        compact
          ? "border-b border-border py-4 last:border-b-0"
          : "border-b border-border py-8 last:border-b-0"
      }
    >
      <div className="flex gap-4">
        <div
          className={
            compact
              ? "flex w-14 shrink-0 flex-col gap-1 text-sm font-medium tabular-nums text-muted-foreground"
              : "flex w-14 shrink-0 flex-col gap-1 text-lg font-semibold tabular-nums text-muted-foreground"
          }
        >
          <span>{rank}</span>
          {rankNote}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={
              compact
                ? "text-base font-semibold tracking-tight text-foreground"
                : "text-xl font-semibold tracking-tight text-foreground"
            }
          >
            {href ? (
              <Link
                href={href}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
          {description ? (
            <p
              className={
                compact
                  ? "mt-2 text-sm leading-relaxed text-muted-foreground"
                  : "mt-3 text-sm leading-relaxed text-muted-foreground md:text-base"
              }
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
