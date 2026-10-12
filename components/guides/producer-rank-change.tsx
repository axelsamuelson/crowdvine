import {
  producerRankChange,
  rankChangePresentation,
} from "@/lib/guides/producer-rank-change";
import type { AppLocale } from "@/lib/i18n/locale";

const TONE_CLASS = {
  up: "text-emerald-700 dark:text-emerald-400",
  down: "text-red-700 dark:text-red-400",
  same: "text-muted-foreground",
  new: "font-medium text-foreground",
} as const;

export function ProducerRankChange({
  rank,
  previousRank,
  locale,
}: {
  rank: number;
  previousRank?: number | null;
  locale: AppLocale;
}) {
  const presentation = rankChangePresentation(
    producerRankChange({ rank, previousRank }),
    locale,
  );

  return (
    <span
      className={`text-xs tabular-nums leading-none ${TONE_CLASS[presentation.tone]}`}
      aria-label={presentation.ariaLabel}
    >
      <span aria-hidden="true">{presentation.text}</span>
    </span>
  );
}
