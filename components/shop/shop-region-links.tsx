import Link from "next/link";

import type { AppLocale } from "@/lib/i18n/locale";
import type { IndexableRegionLink } from "@/lib/shop/indexable-region-links";
import { cn } from "@/lib/utils";

/**
 * Compact indexable region PLP links for the shop roots.
 * Colours match PactSellerConsumerInfo (text-muted-foreground) so the row
 * follows the page theme instead of inventing dark: stone overrides.
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
  if (links.length === 0) return null;

  const heading = locale === "sv" ? "Regioner" : "Regions";
  const textClass = "text-sm text-muted-foreground";
  const linkClass = cn(
    textClass,
    "underline underline-offset-4 hover:text-foreground",
  );

  return (
    <nav className={cn("w-full min-w-0", className)} aria-label={heading}>
      <p className={cn(textClass, "leading-relaxed")}>
        <span className="font-medium text-foreground">{heading}</span>
        <span aria-hidden="true">{" · "}</span>
        {links.map((link, index) => (
          <span key={link.slug}>
            {index > 0 ? <span aria-hidden="true">{" · "}</span> : null}
            <Link href={link.href} className={linkClass}>
              {link.label}
            </Link>
          </span>
        ))}
      </p>
    </nav>
  );
}
