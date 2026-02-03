"use client";

import { useMembership } from "@/lib/context/membership-context";
import { formatPrice, priceExclVat } from "@/lib/shopify/utils";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

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
  const showExclVat = useB2BPriceMode();

  if (loading) {
    // Show skeleton while loading
    return <span className={`${className} opacity-50`}>—</span>;
  }

  const originalPrice =
    typeof amount === "string" ? parseFloat(amount) : amount;
  const displayPrice = showExclVat ? priceExclVat(originalPrice) : originalPrice;
  const hasDiscount = discountPercentage > 0;
  const discountedPrice = hasDiscount
    ? displayPrice * (1 - discountPercentage / 100)
    : displayPrice;

  if (!hasDiscount) {
    return (
      <span className={className}>
        {showExclVat ? (
          <span className="flex flex-col">
            <span>{formatPrice(displayPrice, currencyCode)}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              exkl. moms
            </span>
          </span>
        ) : (
          formatPrice(displayPrice, currencyCode)
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
        {showExclVat ? (
          <span className="flex flex-col">
            <span>{formatPrice(discountedPrice.toFixed(2), currencyCode)}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              exkl. moms
            </span>
          </span>
        ) : (
          formatPrice(discountedPrice.toFixed(2), currencyCode)
        )}
      </span>

      {/* Original Price (strikethrough) */}
      <span className="text-xs line-through opacity-40">
        {formatPrice(displayPrice, currencyCode)}
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
