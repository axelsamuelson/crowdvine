"use client";

import { MemberPrice } from "@/components/ui/member-price";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { Product } from "@/lib/shopify/types";
import { useEffectiveCartSource } from "@/lib/hooks/use-effective-cart-source";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  getProductBasePriceCents,
  getProductListPriceSek,
} from "@/lib/price-breakdown";
import { priceExclVat } from "@/lib/shopify/utils";

interface ProductPriceDisplayProps {
  product: Product;
  className?: string;
  /** When false, membership badge renders in hero tabs instead of under the price. */
  showMembershipBadge?: boolean;
}

/**
 * Displays product price using the same calculation as price breakdown
 * to ensure consistency between the price shown in the first white box
 * and the total price in the breakdown.
 * Price updates based on selected source: producer = B2C (inkl. moms), warehouse = B2B (exkl. moms)
 */
export function ProductPriceDisplay({
  product,
  className,
  showMembershipBadge = true,
}: ProductPriceDisplayProps) {
  const { t } = useTranslations();
  const selectedSource = useEffectiveCartSource();
  const isB2B = useB2BPriceMode();
  const breakdown = useProductPrice(product, selectedSource);
  const listPriceSek = getProductListPriceSek(product);

  // On B2C sites (pactwines.com), show price inkl. moms
  // On B2B sites (dirtywine.se), show price exkl. moms
  // If source is "producer" on B2B site, we still show exkl. moms (B2C price converted)
  // If source is "warehouse" on B2B site, show exkl. moms (B2B price)
  const showExclVat = isB2B;

  // If we have breakdown, use its total price for consistency
  if (breakdown) {
    if (isB2B) {
      // Warehouse/B2B totals are already exkl. moms. Producer/B2C totals are inkl.
      // Convert from stored öre (not ceiled whole-SEK inkl) so admin 147 stays 147.
      const priceExclVatAmount =
        selectedSource === "warehouse" &&
        product.priceBreakdown?.b2bPriceExclVat != null
          ? product.priceBreakdown.b2bPriceExclVat
          : priceExclVat(getProductBasePriceCents(product) / 100);

      return (
        <MemberPrice
          amount={product.priceRange.minVariantPrice.amount}
          currencyCode={product.priceRange.minVariantPrice.currencyCode}
          basePriceSek={listPriceSek ?? undefined}
          className={className}
          showBadge={showMembershipBadge}
          priceExclVatOverride={priceExclVatAmount}
          b2bMarginPercentage={product.priceBreakdown?.b2bMarginPercentage}
          calculatedTotalPrice={priceExclVatAmount}
          forceShowExclVat={true}
          vatExcludedShortLabel={t("common.exclVat")}
        />
      );
    } else {
      // On B2C site: show inkl. moms (breakdown.total is inkl. moms for B2C)
      return (
        <MemberPrice
          amount={product.priceRange.minVariantPrice.amount}
          currencyCode={product.priceRange.minVariantPrice.currencyCode}
          basePriceSek={listPriceSek ?? undefined}
          className={className}
          showBadge={showMembershipBadge}
          calculatedTotalPrice={breakdown.total}
          forceShowExclVat={false}
          vatExcludedShortLabel={t("common.exclVat")}
        />
      );
    }
  }

  // Fallback to regular MemberPrice if no breakdown
  // On B2C sites, show inkl. moms (no override)
  // On B2B sites, show exkl. moms (with override)
  return (
    <MemberPrice
      amount={product.priceRange.minVariantPrice.amount}
      currencyCode={product.priceRange.minVariantPrice.currencyCode}
      basePriceSek={listPriceSek ?? undefined}
      className={className}
      showBadge={showMembershipBadge}
      priceExclVatOverride={
        isB2B
          ? (product.priceBreakdown?.b2bPriceExclVat ??
             (product as any).b2bPriceExclVat)
          : undefined
      }
      b2bMarginPercentage={product.priceBreakdown?.b2bMarginPercentage}
      forceShowExclVat={isB2B}
      vatExcludedShortLabel={t("common.exclVat")}
    />
  );
}
