import { unstable_cache } from "next/cache";

import { catalogHasProducts } from "@/lib/crowdvine/products-data";
import { guidePath } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import { SHOP_ROOT_LABEL } from "@/lib/nav/shop-root-label";
import { PRODUCER_BOXES_PATH, PRODUCER_BOXES_PUBLISHED } from "@/lib/producer-boxes/config";
import { loadResolvedProducerBoxes } from "@/lib/producer-boxes/load";
import {
  isNoindexCategorySlug,
  isThinDynamicGrapeCategory,
} from "@/lib/seo/noindex-robots";
import { indexableRegionLinksFromCounts } from "@/lib/shop/indexable-region-links";
import {
  getWineCategoryEn,
  getWineCategorySv,
  wineCategoryCatalogFilters,
} from "@/lib/wine-categories";
import { getLiveWineRegionCountsMap } from "@/lib/wine-region-live-counts";
import { wineRegionBySlug } from "@/lib/wine-regions";

export type MegaMenuLink = {
  href: string;
  label: string;
};

export type MegaMenuColumn = {
  id: "colour" | "region" | "grape" | "explore";
  heading: string;
  links: MegaMenuLink[];
};

/**
 * There is no shop listing of new arrivals. /guider/nya-naturviner-systembolaget
 * is a Systembolaget guide, not a product listing, so it is not linked here.
 */
export const NEW_WINES_LISTING_PATH: string | null = null;

const HEADINGS: Record<AppLocale, Record<MegaMenuColumn["id"], string>> = {
  sv: {
    colour: "Färg och stil",
    region: "Region",
    grape: "Druva",
    explore: "Utforska",
  },
  en: {
    colour: "Colour and style",
    region: "Region",
    grape: "Grape",
    explore: "Explore",
  },
};

const COLOUR_SLUGS = {
  sv: [
    { slug: "rott-naturvin", label: "Rött naturvin" },
    { slug: "vitt-naturvin", label: "Vitt naturvin" },
    { slug: "orange-naturvin", label: "Orange vin" },
    { slug: "mousserande-vin", label: "Mousserande vin" },
    { slug: "pet-nat", label: "Pet nat" },
  ],
  en: [
    { slug: "red-natural-wine", label: "Red natural wine" },
    { slug: "white-natural-wine", label: "White natural wine" },
    { slug: "orange-natural-wine", label: "Orange wine" },
    { slug: "sparkling-wine", label: "Sparkling wine" },
    { slug: "pet-nat", label: "Pet nat" },
  ],
} as const;

const GRAPE_SLUGS = {
  sv: [
    { slug: "carignan-naturvin", label: "Carignan" },
    { slug: "grenache", label: "Grenache" },
    { slug: "syrah", label: "Syrah" },
    { slug: "cinsault", label: "Cinsault" },
    { slug: "grenache-blanc", label: "Grenache Blanc" },
  ],
  en: [
    { slug: "carignan-natural-wine", label: "Carignan" },
    { slug: "grenache", label: "Grenache" },
    { slug: "syrah", label: "Syrah" },
    { slug: "cinsault", label: "Cinsault" },
    { slug: "grenache-blanc", label: "Grenache Blanc" },
  ],
} as const;

const EXPLORE_BOX = {
  sv: { href: PRODUCER_BOXES_PATH.sv, label: "Naturvinslåda" },
  en: { href: PRODUCER_BOXES_PATH.en, label: "Natural wine box" },
} as const;

const EXPLORE_GUIDES = {
  sv: { href: guidePath("hub", "sv"), label: "Guider" },
  en: { href: guidePath("hub", "en"), label: "Guides" },
} as const;

export function rankMegaMenuRegions(
  links: Array<MegaMenuLink & { count: number }>,
  max = 8,
): MegaMenuLink[] {
  return [...links]
    .sort(
      (a, b) =>
        b.count - a.count || a.label.localeCompare(b.label, "sv"),
    )
    .slice(0, max)
    .map(({ href, label }) => ({ href, label }));
}

function shopPrefix(locale: AppLocale): string {
  return locale === "en" ? "/wine" : "/vin";
}

async function categoryIsListed(
  locale: AppLocale,
  slug: string,
): Promise<boolean> {
  if (isNoindexCategorySlug(slug, locale)) return false;
  const category =
    locale === "sv" ? getWineCategorySv(slug) : getWineCategoryEn(slug);
  if (!category) return false;
  if (isThinDynamicGrapeCategory(category)) return false;
  try {
    return await catalogHasProducts({
      ...wineCategoryCatalogFilters(category.filter),
      isB2BSite: false,
    });
  } catch (error) {
    console.error("[shop-mega-menu] catalog", slug, error);
    return true;
  }
}

async function boxesAreListed(): Promise<boolean> {
  if (!PRODUCER_BOXES_PUBLISHED) return false;
  try {
    const { boxes, loadError } = await loadResolvedProducerBoxes();
    if (loadError) return true;
    return boxes.some((box) => box.purchasable);
  } catch (error) {
    console.error("[shop-mega-menu] producer boxes", error);
    return true;
  }
}

async function listedLinks(
  locale: AppLocale,
  entries: readonly { slug: string; label: string }[],
): Promise<MegaMenuLink[]> {
  const flags = await Promise.all(
    entries.map((entry) => categoryIsListed(locale, entry.slug)),
  );
  return entries
    .filter((_, index) => flags[index])
    .map((entry) => ({
      href: `${shopPrefix(locale)}/${entry.slug}`,
      label: entry.label,
    }));
}

async function regionLinks(locale: AppLocale): Promise<MegaMenuLink[]> {
  try {
    const counts = await getLiveWineRegionCountsMap();
    const ranked = indexableRegionLinksFromCounts(locale, counts).map(
      (link) => {
        const region = wineRegionBySlug(link.slug);
        return {
          href: link.href,
          label: link.label,
          count: region ? (counts.get(region.value) ?? 0) : 0,
        };
      },
    );
    return rankMegaMenuRegions(ranked);
  } catch (error) {
    console.error("[shop-mega-menu] regions", error);
    return [];
  }
}

async function columnsFor(locale: AppLocale): Promise<MegaMenuColumn[]> {
  const [shopLive, colour, grapes, regions, boxesLive] = await Promise.all([
    catalogHasProducts({ isB2BSite: false }).catch(() => true),
    listedLinks(locale, COLOUR_SLUGS[locale]),
    listedLinks(locale, GRAPE_SLUGS[locale]),
    regionLinks(locale),
    boxesAreListed(),
  ]);

  const colourLinks: MegaMenuLink[] = [
    ...(shopLive
      ? [{ href: shopPrefix(locale), label: SHOP_ROOT_LABEL[locale] }]
      : []),
    ...colour,
  ];
  const explore: MegaMenuLink[] = [
    ...(boxesLive ? [EXPLORE_BOX[locale]] : []),
    EXPLORE_GUIDES[locale],
  ];

  const columns: MegaMenuColumn[] = [
    { id: "colour", heading: HEADINGS[locale].colour, links: colourLinks },
    { id: "region", heading: HEADINGS[locale].region, links: regions },
    { id: "grape", heading: HEADINGS[locale].grape, links: grapes },
    { id: "explore", heading: HEADINGS[locale].explore, links: explore },
  ];
  return columns.filter((column) => column.links.length > 0);
}

async function computeShopMegaMenu(): Promise<{
  sv: MegaMenuColumn[];
  en: MegaMenuColumn[];
}> {
  const [sv, en] = await Promise.all([columnsFor("sv"), columnsFor("en")]);
  return { sv, en };
}

/** Header mega menu. Empty or noindex categories are omitted. */
export function getShopMegaMenu(): Promise<{
  sv: MegaMenuColumn[];
  en: MegaMenuColumn[];
}> {
  return unstable_cache(computeShopMegaMenu, ["shop-mega-menu-v1"], {
    revalidate: 300,
  })();
}
