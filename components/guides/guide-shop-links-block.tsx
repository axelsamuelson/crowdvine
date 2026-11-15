import Link from "next/link";

import {
  GUIDE_SHOP_LINKS_HEADING,
  GUIDE_SHOP_LINKS_LEAD,
  getGuideShopLinks,
  type GuideShopLink,
} from "@/lib/guides/shop-links";
import type { AppLocale } from "@/lib/i18n/locale";

export type GuideShopLinksCta = {
  href: string;
  label: string;
  /** Existing shop CTA lead — keep copy exactly as in guide-copy. */
  lead?: string;
};

export type GuideShopLinksBlockProps = {
  /** Public guide pathname, e.g. `/guider/vad-ar-naturvin` or `/guides`. */
  guidePath: string;
  locale: AppLocale;
  /** Optional override when links are already resolved. */
  links?: readonly GuideShopLink[] | null;
  /**
   * When set, renders the existing shop CTA inside this same section
   * (no second divider). Omit on Systembolaget / hub / NONE paths.
   */
  cta?: GuideShopLinksCta | null;
  className?: string;
};

/**
 * Contextual shop links after guide body (before FAQ).
 * Returns null for NONE or unconfigured paths.
 * Optional `cta` merges the existing shop CTA into one section.
 */
export function GuideShopLinksBlock({
  guidePath,
  locale,
  links: linksProp,
  cta,
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
        "space-y-3 border-t border-border pt-6 text-[17px] leading-relaxed text-foreground/80"
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
      {cta ? (
        <div className="space-y-2 text-sm" data-guide-shop-cta="">
          {cta.lead ? (
            <p className="text-[17px] leading-relaxed text-foreground/80">
              {cta.lead}
            </p>
          ) : null}
          <p>
            <Link
              href={cta.href}
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              {cta.label}
            </Link>
          </p>
        </div>
      ) : null}
    </aside>
  );
}
