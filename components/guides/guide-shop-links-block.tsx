import Link from "next/link";

import {
  GUIDE_SHOP_LINKS_BUTTON,
  GUIDE_SHOP_LINKS_HEADING,
  GUIDE_SHOP_LINKS_LEAD,
  getGuideShopLinks,
  sentenceCaseAnchor,
  type GuideShopLink,
} from "@/lib/guides/shop-links";
import type { AppLocale } from "@/lib/i18n/locale";

export type GuideShopLinksCta = {
  href: string;
  /** Existing shop CTA lead from guide-copy — keep wording exact. */
  lead?: string;
};

export type GuideShopLinksBlockProps = {
  /** Public guide pathname, e.g. `/guider/vad-ar-naturvin` or `/guides`. */
  guidePath: string;
  locale: AppLocale;
  /** Optional override when links are already resolved. */
  links?: readonly GuideShopLink[] | null;
  /**
   * When set, shows the black primary shop button (and lead) inside this card.
   * Omit on Systembolaget / hub / NONE paths.
   */
  cta?: GuideShopLinksCta | null;
  className?: string;
};

const ARROW_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-[18px] shrink-0 text-[#0a0a0a]"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/**
 * Contextual shop links after guide body (before FAQ).
 * Pillista rows + optional black primary CTA. Returns null for NONE / empty.
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
  const buttonLabel = GUIDE_SHOP_LINKS_BUTTON[locale];

  return (
    <aside
      className={
        className ??
        "rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-5 pb-5 pt-6 text-[#0a0a0a] md:px-7 md:pb-6 md:pt-7"
      }
      data-guide-shop-links={guidePath}
    >
      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#0a0a0a]">
        {heading}
      </h2>
      <p className="mt-2 text-[15px] leading-[1.55] text-[#1a1a1a]">{lead}</p>

      <ul className="mt-3 border-t border-[#d4d4d4]">
        {links.map((link) => (
          <li key={`${link.href}-${link.anchor}`} className="border-b border-[#d4d4d4]">
            <Link
              href={link.href}
              className="flex min-h-11 items-center justify-between gap-4 px-0.5 text-[15px] font-medium tracking-[-0.01em] text-[#0a0a0a] no-underline hover:text-[#0a0a0a]"
            >
              <span>{sentenceCaseAnchor(link.anchor)}</span>
              {ARROW_ICON}
            </Link>
          </li>
        ))}
      </ul>

      {cta ? (
        <div className="mt-5" data-guide-shop-cta="">
          {cta.lead ? (
            <p className="mb-3 text-sm leading-normal text-[#1a1a1a]">
              {cta.lead}
            </p>
          ) : null}
          <Link
            href={cta.href}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#111] px-[22px] text-sm font-semibold tracking-[-0.01em] text-white no-underline hover:bg-[#111]/90 hover:text-white md:w-auto md:min-w-[220px]"
          >
            {buttonLabel}
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
