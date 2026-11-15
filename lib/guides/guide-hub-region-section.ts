import type { GuideHubCard, GuideHubSection } from "@/lib/guides/guide-copy";
import type { AppLocale } from "@/lib/i18n/locale";
import type { IndexableRegionLink } from "@/lib/shop/indexable-region-links";
import { wineRegionByShopSlug } from "@/lib/wine-regions";

const REGION_SECTION_TITLE: Record<AppLocale, string> = {
  sv: "Regioner",
  en: "Regions",
};

function guidePathSlug(href: string): string | null {
  const match = href.match(/^\/(?:guider|guides)\/([^/?#]+)\/?$/);
  return match?.[1] ?? null;
}

function guideCardMapsToShopRegion(card: GuideHubCard): boolean {
  const slug = guidePathSlug(card.href);
  if (!slug) return false;
  return Boolean(wineRegionByShopSlug(slug));
}

/**
 * Rebuild the hub "Regioner"/"Regions" section so cards point at indexable
 * shop region PLPs. Guide-only region cards that are not shop regions
 * (e.g. Georgia) stay as guide links.
 */
export function withIndexableShopRegionSection(
  sections: GuideHubSection[],
  locale: AppLocale,
  shopRegionLinks: IndexableRegionLink[],
): GuideHubSection[] {
  const regionTitle = REGION_SECTION_TITLE[locale];
  const shopCards: GuideHubCard[] = shopRegionLinks.map((link) => ({
    href: link.href,
    title: link.label,
    description:
      locale === "sv"
        ? `Naturvin från ${link.label}`
        : `Natural wine from ${link.label}`,
  }));

  return sections.map((section) => {
    if (section.title !== regionTitle) return section;

    const guideOnlyCards = section.cards.filter(
      (card) => !guideCardMapsToShopRegion(card),
    );

    return {
      ...section,
      cards: [...shopCards, ...guideOnlyCards],
    };
  });
}
