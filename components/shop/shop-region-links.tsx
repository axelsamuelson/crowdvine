import type { AppLocale } from "@/lib/i18n/locale";
import type { IndexableRegionLink } from "@/lib/shop/indexable-region-links";

import { CategoryPillLinks } from "./category-pill-links";

/**
 * PLP region chip row (Inès / link-rules §1 chiprad).
 * Thin wrapper around CategoryPillLinks.
 */
export function ShopRegionLinks({
  locale,
  links,
  className,
}: {
  locale: AppLocale;
  links: IndexableRegionLink[];
  className?: string;
}) {
  const heading =
    locale === "sv" ? "Utforska per region" : "Explore by region";

  return (
    <CategoryPillLinks
      heading={heading}
      links={links}
      ariaLabel={heading}
      testId="shop-region-chips"
      className={className}
    />
  );
}
