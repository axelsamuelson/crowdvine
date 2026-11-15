import Link from "next/link";

import type { AppLocale } from "@/lib/i18n/locale";
import type { IndexableRegionLink } from "@/lib/shop/indexable-region-links";

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

  return (
    <section className={className} aria-label={heading}>
      <h2 className="mb-3 text-sm font-medium text-stone-900 dark:text-stone-100">
        {heading}
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {links.map((link) => (
          <li key={link.slug}>
            <Link
              href={link.href}
              className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
