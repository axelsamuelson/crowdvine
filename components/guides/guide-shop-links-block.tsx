import Link from "next/link";

import {
  GUIDE_SHOP_LINKS_HEADING,
  GUIDE_SHOP_LINKS_LEAD,
  getGuideShopLinks,
  type GuideShopLink,
} from "@/lib/guides/shop-links";
import type { AppLocale } from "@/lib/i18n/locale";

export type GuideShopLinksBlockProps = {
  /** Public guide pathname, e.g. `/guider/vad-ar-naturvin` or `/guides`. */
  guidePath: string;
  locale: AppLocale;
  /** Optional override when links are already resolved. */
  links?: readonly GuideShopLink[] | null;
  className?: string;
};

/**
 * Contextual shop links after guide body (before FAQ / existing shop CTA).
 * Returns null for NONE or unconfigured paths.
 */
export function GuideShopLinksBlock({
  guidePath,
  locale,
  links: linksProp,
  className,
}: GuideShopLinksBlockProps) {
  const links =
    linksProp !== undefined ? linksProp : getGuideShopLinks(guidePath);
  if (!links || links.length === 0) return null;

  const heading = GUIDE_SHOP_LINKS_HEADING[locale];
  const lead = GUIDE_SHOP_LINKS_LEAD[locale];

  return (
    <aside
      className={
        className ??
        "mt-6 space-y-3 border-t border-border pt-6 text-[17px] leading-relaxed text-foreground/80"
      }
      data-guide-shop-links={guidePath}
    >
      <h2 className="text-xl font-medium tracking-[-0.02em] text-foreground">
        {heading}
      </h2>
      <p>{lead}</p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={`${link.href}-${link.anchor}`}>
            <Link
              href={link.href}
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              {link.anchor}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
