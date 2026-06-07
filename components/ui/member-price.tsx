"use client";

import { useMembership } from "@/lib/context/membership-context";
import { priceExclVat } from "@/lib/shopify/utils";
import { useDisplayMoney } from "@/lib/hooks/use-display-money";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useMembershipDiscountPercent } from "@/lib/hooks/use-membership-discount-percent";
import { calculateB2BPriceWithDiscount } from "@/lib/price-breakdown";
import { useTranslations } from "@/lib/hooks/use-translations";
import { membershipLevelMessageKey } from "@/lib/i18n/membership-levels";
import {
  membershipLevelDiscountBadgeClassName,
  membershipLevelDiscountBadgeStyle,
} from "@/lib/membership/level-visual-style";
import { cn } from "@/lib/utils";

interface MemberPriceProps {
  amount: string | number;
  currencyCode: string;
  /** Canonical SEK list price inkl. moms — avoids display-currency mismatch on shop cards. */
  basePriceSek?: number | null;
  className?: string;
  showBadge?: boolean;
  /** When set and in B2B mode, use this exkl moms price instead of deriving from amount */
  priceExclVatOverride?: number;
  /** B2B margin percentage - needed to calculate discount correctly on B2B price */
  b2bMarginPercentage?: number;
  /** Calculated total price from breakdown - if provided, use this instead of calculating */
  calculatedTotalPrice?: number;
  /** Force show excl. moms regardless of B2B mode (for warehouse source) */
  forceShowExclVat?: boolean;
  /** On viewports below md: hide only the badge (strikethrough still shown, e.g. product card corner on mobile) */
  compactOnMobile?: boolean;
  /** In white box: on mobile badge to the right of price, on desktop badge below price */
  badgeRightOnMobile?: boolean;
  /** Shown under price when excl. VAT applies (B2B). Default "exkl. moms"; set e.g. "excl. VAT" on English PDP. */
  vatExcludedShortLabel?: string;
}

interface DiscountPriceLayoutProps {
  className: string;
  displayPriceLabel: string;
  originalPriceLabel: string;
  showVatLabel: boolean;
  vatLabel: string;
  showBadge: boolean;
  membershipLevel: string | null;
  levelName: string;
  discountPercentage: number;
  compactOnMobile: boolean;
  badgeRightOnMobile: boolean;
  badgeText: string;
}

/** Badge sits in the price column so its width matches the price, not price + strikethrough. */
function DiscountPriceLayout({
  className,
  displayPriceLabel,
  originalPriceLabel,
  showVatLabel,
  vatLabel,
  showBadge,
  membershipLevel,
  levelName,
  discountPercentage,
  compactOnMobile,
  badgeRightOnMobile,
  badgeText,
}: DiscountPriceLayoutProps) {
  const primaryPrice = (
    <span className={className}>
      <span className="flex flex-col">
        <span className="whitespace-nowrap tabular-nums">{displayPriceLabel}</span>
        {showVatLabel ? (
          <span className="text-[8px] font-normal text-muted-foreground md:text-[10px]">
            {vatLabel}
          </span>
        ) : null}
      </span>
    </span>
  );

  const strikethroughPrice = (
    <span className="text-xs line-through opacity-40">
      <span className="flex flex-col">
        <span className="whitespace-nowrap tabular-nums">{originalPriceLabel}</span>
        {showVatLabel ? (
          <span className="text-[7px] font-normal text-muted-foreground md:text-[8px]">
            {vatLabel}
          </span>
        ) : null}
      </span>
    </span>
  );

  const badgeEl =
    showBadge && levelName ? (
      <span
        className={cn(
          "box-border w-full min-w-0 rounded-md px-2 py-0.5 text-center text-[10px] font-medium leading-tight",
          membershipLevelDiscountBadgeClassName(membershipLevel),
          compactOnMobile && "max-md:hidden",
          badgeRightOnMobile ? "shrink-0 md:mt-0.5" : "mt-0.5",
        )}
        style={membershipLevelDiscountBadgeStyle(membershipLevel)}
      >
        {badgeText}
      </span>
    ) : null;

  const priceColumn = (
    <div
      className={cn(
        "max-w-full",
        badgeRightOnMobile
          ? "flex min-w-0 flex-row flex-nowrap items-center gap-1.5 md:inline-flex md:w-fit md:flex-col md:items-stretch md:gap-0"
          : "inline-flex w-fit max-w-full flex-col items-stretch gap-0.5",
      )}
    >
      <div className="flex flex-col gap-0.5">
        {strikethroughPrice}
        {primaryPrice}
      </div>
      {badgeEl}
    </div>
  );

  return (
    <div className="inline-flex w-max max-w-full flex-col gap-0">{priceColumn}</div>
  );
}

export function MemberPrice({
  amount,
  currencyCode,
  basePriceSek,
  className = "",
  showBadge = false,
  priceExclVatOverride,
  b2bMarginPercentage,
  calculatedTotalPrice,
  forceShowExclVat,
  compactOnMobile = false,
  badgeRightOnMobile = false,
  vatExcludedShortLabel,
}: MemberPriceProps) {
  const { t } = useTranslations();
  const { formatSek, formatProductPrice } = useDisplayMoney();
  const { level, loading } = useMembership();
  const discountPercentage = useMembershipDiscountPercent();
  const isB2BMode = useB2BPriceMode();
  const showExclVat = forceShowExclVat !== undefined ? forceShowExclVat : isB2BMode;
  const vatLabel = showExclVat
    ? (vatExcludedShortLabel ?? t("common.exclVat"))
    : "";
  const showVatLabel = showExclVat;

  if (loading) {
    return <span className={`${className} opacity-50`}>—</span>;
  }

  const levelName = level ? t(membershipLevelMessageKey(level)) : "";
  const badgeText = t("shop.membershipDiscount", {
    level: levelName,
    percent: discountPercentage,
  });

  const discountLayoutProps = (
    displayPriceLabel: string,
    originalPriceLabel: string,
  ): DiscountPriceLayoutProps => ({
    className,
    displayPriceLabel,
    originalPriceLabel,
    showVatLabel,
    vatLabel,
    showBadge,
    membershipLevel: level,
    levelName,
    discountPercentage,
    compactOnMobile,
    badgeRightOnMobile,
    badgeText,
  });

  const parsedAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;

  const listPriceSek =
    basePriceSek != null && Number.isFinite(basePriceSek)
      ? basePriceSek
      : currencyCode.trim().toUpperCase() === "SEK"
        ? parsedAmount
        : null;

  const formatListPrice = (value: number) =>
    listPriceSek != null
      ? formatSek(value)
      : formatProductPrice({
          amount: value,
          listCurrencyCode: currencyCode,
          basePriceSek: listPriceSek,
        });

  if (calculatedTotalPrice != null) {
    const displayPrice = calculatedTotalPrice;
    const hasDiscount = discountPercentage > 0;

    if (!hasDiscount) {
      return (
        <span className={className}>
          <span className="flex flex-col">
            <span>{formatSek(displayPrice)}</span>
            {showVatLabel ? (
              <span className="text-[8px] font-normal text-muted-foreground md:text-[10px]">
                {vatLabel}
              </span>
            ) : null}
          </span>
        </span>
      );
    }

    const originalPrice =
      showExclVat && priceExclVatOverride != null
        ? priceExclVatOverride
        : listPriceSek ?? parsedAmount;

    return (
      <DiscountPriceLayout
        {...discountLayoutProps(
          formatSek(displayPrice),
          listPriceSek != null || showExclVat
            ? formatSek(originalPrice)
            : formatListPrice(originalPrice),
        )}
      />
    );
  }

  const displayPrice =
    showExclVat
      ? (priceExclVatOverride ?? (listPriceSek != null ? priceExclVat(listPriceSek) : priceExclVat(parsedAmount)))
      : (listPriceSek ?? parsedAmount);

  const hasDiscount = discountPercentage > 0;

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
          <span>{formatListPrice(displayPrice)}</span>
          {showVatLabel ? (
            <span className="text-[8px] font-normal text-muted-foreground md:text-[10px]">
              {vatLabel}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <DiscountPriceLayout
      {...discountLayoutProps(
        formatListPrice(discountedPrice),
        formatListPrice(displayPrice),
      )}
    />
  );
}
