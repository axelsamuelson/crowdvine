import type { CSSProperties } from "react";
import type { RecommendationReason } from "@/lib/product/recommendations";

const REASON_TAB_STYLE: Record<
  RecommendationReason,
  { className: string; style: CSSProperties }
> = {
  same_producer: {
    className: "text-white",
    style: {
      backgroundImage: "linear-gradient(to bottom right, #1E4A7A, #123052)",
    },
  },
  similar_profile: {
    className: "text-white",
    style: {
      backgroundImage: "linear-gradient(to bottom right, #2F5233, #1A331C)",
    },
  },
};

export function recommendationReasonTabClassName(
  reason: RecommendationReason,
): string {
  return REASON_TAB_STYLE[reason].className;
}

export function recommendationReasonTabStyle(
  reason: RecommendationReason,
): CSSProperties {
  return REASON_TAB_STYLE[reason].style;
}
