import Link from "next/link";

type GuideRankEntryProps = {
  rank: number;
  title: string;
  meta: string;
  description?: string;
  compact?: boolean;
  href?: string;
};

export function GuideRankEntry({
  rank,
  title,
  meta,
  description,
  compact = false,
  href,
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
        <span
          className={
            compact
              ? "w-8 shrink-0 text-sm font-medium tabular-nums text-muted-foreground"
              : "w-10 shrink-0 text-lg font-semibold tabular-nums text-muted-foreground"
          }
        >
          {rank}
        </span>
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
