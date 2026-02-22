"use client";

import { useMembership } from "@/lib/context/membership-context";
import { formatPrice, priceExclVat } from "@/lib/shopify/utils";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { calculateB2BPriceWithDiscount } from "@/lib/price-breakdown";

/** Visningsnamn för medlemskapsnivå (samma som level-badge / points-engine) */
const MEMBERSHIP_LEVEL_NAMES: Record<string, string> = {
  basic: "Basic",
  brons: "Plus",
  silver: "Premium",
  guld: "Priority",
  privilege: "Privilege",
  admin: "Admin",
};

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
  /** On viewports below md: hide only the badge (strikethrough still shown, e.g. product card corner on mobile) */
  compactOnMobile?: boolean;
  /** In white box: on mobile badge to the right of price, on desktop badge below price */
  badgeRightOnMobile?: boolean;
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
  compactOnMobile = false,
  badgeRightOnMobile = false,
}: MemberPriceProps) {
  const { discountPercentage, level, loading } = useMembership();
  const isB2BMode = useB2BPriceMode();
  // Use forceShowExclVat if provided, otherwise use B2B mode
  // On B2C (pactwines.com): no VAT label under price
  // On B2B (dirtywine.se): show "exkl. moms"
  const showExclVat = forceShowExclVat !== undefined ? forceShowExclVat : isB2BMode;
  const vatLabel = showExclVat ? "exkl. moms" : "";
  const showVatLabel = showExclVat;

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
            {showVatLabel && (
              <span className="text-[8px] md:text-[10px] font-normal text-muted-foreground">
                {vatLabel}
              </span>
            )}
          </span>
        </span>
      );
    }

    const levelName = level ? MEMBERSHIP_LEVEL_NAMES[level.toLowerCase()] ?? "" : "";

    // For discount display, we need the original price before discount
    // Since calculatedTotalPrice is already discounted, we need to calculate original
    const originalPrice = showExclVat && priceExclVatOverride
      ? priceExclVatOverride
      : (typeof amount === "string" ? parseFloat(amount) : amount);

    const priceBlock = (
      <div className="flex flex-col md:flex-row md:items-baseline md:gap-2 gap-0.5">
        <span className={className}>
          <span className="flex flex-col">
            <span>{formatPrice(displayPrice.toFixed(2), currencyCode)}</span>
            {showVatLabel && (
              <span className="text-[8px] md:text-[10px] font-normal text-muted-foreground">
                {vatLabel}
              </span>
            )}
          </span>
        </span>
        <span className="text-xs line-through opacity-40">
          <span className="flex flex-col">
            <span>{formatPrice(originalPrice.toFixed(2), currencyCode)}</span>
            {showVatLabel && (
              <span className="text-[7px] md:text-[8px] font-normal text-muted-foreground">
                {vatLabel}
              </span>
            )}
          </span>
        </span>
      </div>
    );
    const badgeEl =
      showBadge && levelName ? (
        <span
          className={
            compactOnMobile
              ? "max-md:hidden mt-0.5 block w-full rounded-md bg-black px-2 py-0.5 text-[10px] font-medium text-white"
              : badgeRightOnMobile
                ? "shrink-0 rounded-md bg-black px-2 py-0.5 text-[10px] font-medium text-white md:mt-0.5 md:block md:w-full"
                : "mt-0.5 block w-full rounded-md bg-black px-2 py-0.5 text-[10px] font-medium text-white"
          }
        >
          {levelName} -{discountPercentage}%
        </span>
      ) : null;

    return (
      <div
        className={
          badgeRightOnMobile
            ? "flex w-max min-w-0 max-w-full flex-row flex-nowrap items-center gap-1.5 sm:gap-2 md:flex-col md:flex-wrap md:items-stretch md:gap-0"
            : "flex w-max min-w-full flex-col gap-0"
        }
      >
        {badgeRightOnMobile ? <div className="min-w-0 flex-1">{priceBlock}</div> : priceBlock}
        {badgeEl}
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
        <span className="flex flex-col">
          <span>{formatPrice(displayPrice, currencyCode)}</span>
          {showVatLabel && (
            <span className="text-[8px] md:text-[10px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          )}
        </span>
      </span>
    );
  }

  const levelName = level ? MEMBERSHIP_LEVEL_NAMES[level.toLowerCase()] ?? "" : "";

  const priceBlock = (
    <div className="flex flex-col md:flex-row md:items-baseline md:gap-2 gap-0.5">
      <span className={className}>
        <span className="flex flex-col">
          <span>{formatPrice(discountedPrice.toFixed(2), currencyCode)}</span>
          {showVatLabel && (
            <span className="text-[8px] md:text-[10px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          )}
        </span>
      </span>
      <span className="text-xs line-through opacity-40">
        <span className="flex flex-col">
          <span>{formatPrice(displayPrice.toFixed(2), currencyCode)}</span>
          {showVatLabel && (
            <span className="text-[7px] md:text-[8px] font-normal text-muted-foreground">
              {vatLabel}
            </span>
          )}
        </span>
      </span>
    </div>
  );
  const badgeEl =
    showBadge && levelName ? (
      <span
        className={
          compactOnMobile
            ? "max-md:hidden mt-0.5 block w-full rounded-md bg-black px-2 py-0.5 text-[10px] font-medium text-white"
            : badgeRightOnMobile
              ? "shrink-0 rounded-md bg-black px-2 py-0.5 text-[10px] font-medium text-white md:mt-0.5 md:block md:w-full"
              : "mt-0.5 block w-full rounded-md bg-black px-2 py-0.5 text-[10px] font-medium text-white"
        }
      >
        {levelName} -{discountPercentage}%
      </span>
    ) : null;

  return (
    <div
      className={
        badgeRightOnMobile
          ? "flex w-max min-w-0 max-w-full flex-row flex-nowrap items-center gap-1.5 sm:gap-2 md:flex-col md:flex-wrap md:items-stretch md:gap-0"
          : "flex w-max min-w-full flex-col gap-0"
      }
    >
      {badgeRightOnMobile ? <div className="min-w-0 flex-1">{priceBlock}</div> : priceBlock}
      {badgeEl}
    </div>
  );
}
