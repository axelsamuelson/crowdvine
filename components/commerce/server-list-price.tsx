import type { AppLocale } from "@/lib/i18n/locale";
import { getProductListPriceSek } from "@/lib/price-breakdown";
import { formatPrice } from "@/lib/shopify/utils";
import type { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

/**
 * Server-rendered list price (inkl. moms). Visible without client JS.
 * Client MemberPrice may enhance with membership discounts after hydration.
 */
export function ServerListPrice({
  product,
  locale = "sv",
  className,
}: {
  product: Product;
  locale?: AppLocale;
  className?: string;
}) {
  const listPriceSek = getProductListPriceSek(product);
  const { amount, currencyCode } = product.priceRange.minVariantPrice;
  const intlLocale = locale === "en" ? "en-SE" : "sv-SE";
  const label =
    listPriceSek != null
      ? formatPrice(listPriceSek, "SEK", intlLocale)
      : formatPrice(amount, currencyCode, intlLocale);

  return (
    <span className={cn("tabular-nums whitespace-nowrap", className)}>
      {label}
    </span>
  );
}
