"use client";

import { PriceBreakdown } from "./price-breakdown";
import { WineEnrichmentCollapsible } from "@/components/product/wine-enrichment-collapsible";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { useMembershipDiscountPercent } from "@/lib/hooks/use-membership-discount-percent";
import { Product } from "@/lib/shopify/types";
import { useCartSource } from "@/components/cart/cart-source-context";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useTranslations } from "@/lib/hooks/use-translations";

interface ProductPriceInfoBoxProps {
  product: Product;
}

/**
 * Collapsible price breakdown under grape varieties / color on the product page.
 */
export function ProductPriceInfoBox({ product }: ProductPriceInfoBoxProps) {
  const { t } = useTranslations();
  const discountPercentage = useMembershipDiscountPercent();
  const { selectedSource } = useCartSource();
  const isB2B = useB2BPriceMode();
  const breakdown = useProductPrice(product, selectedSource);

  const hasMemberDiscount = discountPercentage > 0;

  // No breakdown data: don't render the box (price is already in the first box)
  if (!product.priceBreakdown || !breakdown) {
    return null;
  }

  // On B2C sites (pactwines.com): breakdown.total is inkl. moms, show as is
  // On B2B sites (dirtywine.se): 
  //   - For producer source: breakdown.total is inkl. moms (B2C), convert to exkl. moms
  //   - For warehouse source: breakdown.total is already exkl. moms (B2B)
  const displayTotal = isB2B && selectedSource === "producer"
    ? breakdown.total / 1.25 // Convert from inkl. moms to exkl. moms
    : breakdown.total; // B2C: inkl. moms, B2B warehouse: exkl. moms

  return (
    <WineEnrichmentCollapsible title={t("product.pdp.priceBreakdown")}>
      <PriceBreakdown
        costAmount={breakdown.cost}
        alcoholTax={breakdown.alcoholTax}
        shipping={breakdown.shipping}
        margin={breakdown.margin}
        vat={breakdown.vat}
        totalPrice={displayTotal}
        marginPercentage={breakdown.marginPercentage}
        originalMarginPercentage={breakdown.originalMarginPercentage}
        hasMemberDiscount={hasMemberDiscount}
        memberDiscountPercent={discountPercentage}
        memberDiscountAmount={breakdown.memberDiscountAmount}
        listTotalInclVat={breakdown.listTotalInclVat}
        variant="inline"
      />
    </WineEnrichmentCollapsible>
  );
}
