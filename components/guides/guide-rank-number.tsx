import type { ReactNode } from "react";

type GuideRankNumberProps = {
  rank: number;
  adornment?: ReactNode;
};

/** Icon slot is always reserved so ranks stay vertically aligned. */
export function GuideRankNumber({ rank, adornment }: GuideRankNumberProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex size-4 shrink-0 items-center justify-center">
        {adornment}
      </span>
      <span className="tabular-nums">{rank}</span>
    </span>
  );
}
