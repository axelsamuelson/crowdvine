"use client";

import { PriceBreakdown } from "./price-breakdown";
import { WineEnrichmentCollapsible } from "@/components/product/wine-enrichment-collapsible";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { useMembershipDiscountPercent } from "@/lib/hooks/use-membership-discount-percent";
import { Product } from "@/lib/shopify/types";
import { useEffectiveCartSource } from "@/lib/hooks/use-effective-cart-source";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useTranslations } from "@/lib/hooks/use-translations";
import { getProductBasePriceCents } from "@/lib/price-breakdown";
import { priceExclVat } from "@/lib/shopify/utils";

interface ProductPriceInfoBoxProps {
  product: Product;
}

/**
 * Collapsible price breakdown under grape varieties / color on the product page.
 */
export function ProductPriceInfoBox({ product }: ProductPriceInfoBoxProps) {
  const { t } = useTranslations();
  const discountPercentage = useMembershipDiscountPercent();
  const selectedSource = useEffectiveCartSource();
  const isB2B = useB2BPriceMode();
  const breakdown = useProductPrice(product, selectedSource);

  const hasMemberDiscount = discountPercentage > 0;

  // No breakdown data: don't render the box (price is already in the first box)
  if (!product.priceBreakdown || !breakdown) {
    return null;
  }

  // B2C: inkl. moms. Dirty Wine warehouse: exkl. moms. Producer fallback: exkl. from öre.
  const usingWarehouseB2B =
    isB2B &&
    selectedSource === "warehouse" &&
    product.priceBreakdown.b2bPriceExclVat != null;
  const displayTotal = usingWarehouseB2B
    ? (product.priceBreakdown.b2bPriceExclVat ?? breakdown.total)
    : isB2B
      ? priceExclVat(getProductBasePriceCents(product) / 100)
      : breakdown.total;

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
        listTotalInclVat={
          usingWarehouseB2B ? undefined : breakdown.listTotalInclVat
        }
        roundMoney={usingWarehouseB2B || isB2B ? "round" : "ceil"}
        variant="inline"
      />
    </WineEnrichmentCollapsible>
  );
}
