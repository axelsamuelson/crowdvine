"use client";

import {
  PdpPriceBadge,
  pdpHeroTabBadgeClass,
} from "@/components/pdp/pdp-price-badge";
import { useMembershipDiscountPercent } from "@/lib/hooks/use-membership-discount-percent";
import { useMembership } from "@/lib/context/membership-context";
import { useTranslations } from "@/lib/hooks/use-translations";
import { membershipLevelMessageKey } from "@/lib/i18n/membership-levels";
import {
  membershipLevelDiscountBadgeClassName,
  membershipLevelDiscountBadgeStyle,
} from "@/lib/membership/level-visual-style";
import { cn } from "@/lib/utils";

type MembershipDiscountTabProps = {
  /** Hero PDP: hide when discount is 0. Recommendation cards: always show level + %. */
  requireDiscount?: boolean;
  variant?: "hero-tab" | "inline";
};

export function MembershipDiscountTab({
  requireDiscount = false,
  variant = "hero-tab",
}: MembershipDiscountTabProps) {
  const { t } = useTranslations();
  const { level, loading } = useMembership();
  const discountPercentage = useMembershipDiscountPercent();

  if (loading || !level) {
    return null;
  }

  if (requireDiscount && discountPercentage <= 0) {
    return null;
  }

  const levelName = t(membershipLevelMessageKey(level));

  return (
    <PdpPriceBadge
      customAppearance
      className={cn(
        variant === "hero-tab" && pdpHeroTabBadgeClass,
        membershipLevelDiscountBadgeClassName(level),
      )}
      style={membershipLevelDiscountBadgeStyle(level)}
    >
      {t("shop.membershipDiscount", {
        level: levelName,
        percent: discountPercentage,
      })}
    </PdpPriceBadge>
  );
}
