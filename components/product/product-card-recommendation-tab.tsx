"use client";

import {
  PdpPriceBadge,
  pdpHeroTabBadgeClass,
} from "@/components/pdp/pdp-price-badge";
import type { RecommendationReason } from "@/lib/product/recommendations";
import {
  recommendationReasonTabClassName,
  recommendationReasonTabStyle,
} from "@/lib/product/recommendation-reason-style";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

export function ProductCardRecommendationTab({
  reason,
}: {
  reason: RecommendationReason;
}) {
  const { t } = useTranslations();
  const label =
    reason === "same_producer"
      ? t("product.pdp.reasonSameProducer")
      : t("product.pdp.reasonSimilar");

  return (
    <PdpPriceBadge
      customAppearance
      className={cn(
        pdpHeroTabBadgeClass,
        recommendationReasonTabClassName(reason),
      )}
      style={recommendationReasonTabStyle(reason)}
    >
      {label}
    </PdpPriceBadge>
  );
}
