import type { ReactNode } from "react";
import Link from "next/link";

import { GuideRankNumber } from "@/components/guides/guide-rank-number";

type GuideRankEntryProps = {
  rank: number;
  title: string;
  meta: string;
  description?: ReactNode;
  compact?: boolean;
  href?: string;
  rankNote?: ReactNode;
  /** Sits to the left of the rank number. */
  rankAdornment?: ReactNode;
};

export function GuideRankEntry({
  rank,
  title,
  meta,
  description,
  compact = false,
  href,
  rankNote,
  rankAdornment,
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
              ? "flex w-[4.25rem] shrink-0 flex-col gap-1 text-sm font-medium text-muted-foreground"
              : "flex w-[4.25rem] shrink-0 flex-col gap-1 text-lg font-semibold text-muted-foreground"
          }
        >
          <GuideRankNumber rank={rank} adornment={rankAdornment} />
          {rankNote ? <div className="pl-[1.375rem]">{rankNote}</div> : null}
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
