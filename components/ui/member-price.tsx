"use client";

import { useMembership } from "@/lib/context/membership-context";
import { formatPrice, priceExclVat } from "@/lib/shopify/utils";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { calculateB2BPriceWithDiscount } from "@/lib/price-breakdown";

interface MemberPriceProps {
  amount: string | number;
  currencyCode: string;
  className?: string;
  showBadge?: boolean;
  /** When set and in B2B mode, use this exkl moms price instead of deriving from amount */
  priceExclVatOverride?: number;
  /** B2B margin percentage - needed to calculate discount correctly on B2B price */
  b2bMarginPercentage?: number;
  /** Calculated total price from breakdown - if provided, use this instead of calculating */
  calculatedTotalPrice?: number;
  /** Force show exkl. moms regardless of B2B mode (for warehouse source) */
  forceShowExclVat?: boolean;
}

export function MemberPrice({
  amount,
  currencyCode,
  className = "",
  showBadge = false,
  priceExclVatOverride,
  b2bMarginPercentage,
  calculatedTotalPrice,
  forceShowExclVat,
}: MemberPriceProps) {
  const { discountPercentage, level, loading } = useMembership();
  const isB2BMode = useB2BPriceMode();
  // Use forceShowExclVat if provided, otherwise use B2B mode
  // On B2C sites (pactwines.com), show inkl. moms
  // On B2B sites (dirtywine.se), show exkl. moms
  const showExclVat = forceShowExclVat !== undefined ? forceShowExclVat : isB2BMode;
  const vatLabel = showExclVat ? "exkl. moms" : "inkl. moms";

  if (loading) {
    // Show skeleton while loading
    return <span className={`${className} opacity-50`}>—</span>;
  }

  // If calculatedTotalPrice is provided, use it directly (ensures consistency with breakdown)
  if (calculatedTotalPrice != null) {
    // calculatedTotalPrice is already in the correct format:
    // - On B2C sites: inkl. moms
    // - On B2B sites: exkl. moms (already converted in ProductPriceDisplay if needed)
    const displayPrice = calculatedTotalPrice;
    const hasDiscount = discountPercentage > 0;
    
    if (!hasDiscount) {
      return (
        <span className={className}>
          <span className="flex flex-col">
            <span>{formatPrice(displayPrice, currencyCode)}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          </span>
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

    // For discount display, we need the original price before discount
    // Since calculatedTotalPrice is already discounted, we need to calculate original
    const originalPrice = showExclVat && priceExclVatOverride
      ? priceExclVatOverride
      : (typeof amount === "string" ? parseFloat(amount) : amount);

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Discounted Price (prominent) */}
        <span className={className}>
          {showExclVat ? (
            <span className="flex flex-col">
              <span>{formatPrice(displayPrice.toFixed(2), currencyCode)}</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {vatLabel}
              </span>
            </span>
        ) : (
          <span className="flex flex-col">
            <span>{formatPrice(displayPrice.toFixed(2), currencyCode)}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          </span>
        )}
      </span>

        {/* Original Price (strikethrough) */}
        <span className="text-xs line-through opacity-40">
          <span className="flex flex-col">
            <span>{formatPrice(originalPrice.toFixed(2), currencyCode)}</span>
            <span className="text-[8px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          </span>
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

  const originalPrice =
    typeof amount === "string" ? parseFloat(amount) : amount;
  const displayPrice =
    showExclVat
      ? (priceExclVatOverride ?? priceExclVat(originalPrice))
      : originalPrice;
  const hasDiscount = discountPercentage > 0;
  
  // For B2B price with discount, apply discount to margin only, not entire price
  const discountedPrice = hasDiscount
    ? showExclVat && priceExclVatOverride && b2bMarginPercentage != null
      ? calculateB2BPriceWithDiscount(
          priceExclVatOverride,
          b2bMarginPercentage,
          discountPercentage,
        )
      : displayPrice * (1 - discountPercentage / 100)
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
          <span className="flex flex-col">
            <span>{formatPrice(displayPrice, currencyCode)}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          </span>
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
              {vatLabel}
            </span>
          </span>
        ) : (
          <span className="flex flex-col">
            <span>{formatPrice(discountedPrice.toFixed(2), currencyCode)}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          </span>
        )}
      </span>

      {/* Original Price (strikethrough) */}
      <span className="text-xs line-through opacity-40">
        <span className="flex flex-col">
          <span>{formatPrice(displayPrice.toFixed(2), currencyCode)}</span>
          <span className="text-[8px] font-normal text-muted-foreground">
            {vatLabel}
          </span>
        </span>
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
