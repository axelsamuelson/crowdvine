"use client";

import { useMembership } from "@/lib/context/membership-context";
import { formatPrice } from "@/lib/shopify/utils";
import { useB2B } from "@/lib/context/b2b-context";
import { formatPriceForB2B } from "@/lib/utils/b2b-pricing";

interface MemberPriceProps {
  amount: string | number;
  currencyCode: string;
  className?: string;
  showBadge?: boolean;
}

export function MemberPrice({
  amount,
  currencyCode,
  className = "",
  showBadge = false,
}: MemberPriceProps) {
  const { discountPercentage, level, loading } = useMembership();
  const { isB2BMode } = useB2B();

  if (loading) {
    // Show skeleton while loading
    return <span className={`${className} opacity-50`}>—</span>;
  }

  const originalPrice =
    typeof amount === "string" ? parseFloat(amount) : amount;
  const hasDiscount = discountPercentage > 0;
  const discountedPrice = hasDiscount
    ? originalPrice * (1 - discountPercentage / 100)
    : originalPrice;

  // Use B2B pricing if in B2B mode
  const formatPriceFunc = isB2BMode ? formatPriceForB2B : formatPrice;
  const formatPriceOptions = isB2BMode ? { excludeVat: true } : {};

  if (!hasDiscount) {
    return (
      <span className={className}>
        {formatPriceFunc(amount, currencyCode, isB2BMode)}
        {isB2BMode && (
          <span className="text-xs text-muted-foreground ml-1">exkl. moms</span>
        )}
      </span>
    );
  }

  // Get level name for badge
  const levelName =
    level === "guld"
      ? "Gold"
      : level === "silver"
        ? "Silver"
        : level === "brons"
          ? "Bronze"
          : "";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Discounted Price (prominent) */}
      <span className={className}>
        {formatPriceFunc(discountedPrice.toFixed(2), currencyCode, isB2BMode)}
        {isB2BMode && (
          <span className="text-xs text-muted-foreground ml-1">exkl. moms</span>
        )}
      </span>

      {/* Original Price (strikethrough) */}
      <span className="text-xs line-through opacity-40">
        {formatPriceFunc(amount, currencyCode, isB2BMode)}
      </span>

      {/* Member Badge (optional, small) */}
      {showBadge && levelName && (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-white font-medium">
          {levelName} -{discountPercentage}%
        </span>
      )}
    </div>
  );
}
