import { guidePath } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  countWinesForFilter,
  getShopMenuCatalog,
  type ShopMenuCatalog,
} from "@/lib/nav/shop-menu-catalog";
import { SHOP_ROOT_LABEL } from "@/lib/nav/shop-root-label";
import { PRODUCER_BOXES_PATH } from "@/lib/producer-boxes/config";
import {
  isNoindexCategorySlug,
  isThinDynamicGrapeCategory,
} from "@/lib/seo/noindex-robots";
import { indexableRegionLinksFromCounts } from "@/lib/shop/indexable-region-links";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";
import {
  WINE_REGIONS,
  wineRegionBySlug,
  wineRegionPagePath,
} from "@/lib/wine-regions";

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

function categoryIsListed(
  locale: AppLocale,
  slug: string,
  catalog: ShopMenuCatalog | null,
): boolean {
  if (isNoindexCategorySlug(slug, locale)) return false;
  const category =
    locale === "sv" ? getWineCategorySv(slug) : getWineCategoryEn(slug);
  if (!category) return false;
  if (isThinDynamicGrapeCategory(category)) return false;
  if (!catalog) return true;
  return countWinesForFilter(catalog.wines, category.filter) > 0;
}

function listedLinks(
  locale: AppLocale,
  entries: readonly { slug: string; label: string }[],
  catalog: ShopMenuCatalog | null,
): MegaMenuLink[] {
  return entries
    .filter((entry) => categoryIsListed(locale, entry.slug, catalog))
    .map((entry) => ({
      href: `${shopPrefix(locale)}/${entry.slug}`,
      label: entry.label,
    }));
}

function regionLinks(
  locale: AppLocale,
  catalog: ShopMenuCatalog | null,
): MegaMenuLink[] {
  if (!catalog) {
    return WINE_REGIONS.map((region) => ({
      href: wineRegionPagePath(region.slug, locale),
      label: locale === "sv" ? region.labelSv : region.labelEn,
    }));
  }
  const counts = new Map(Object.entries(catalog.regionCounts));
  const ranked = indexableRegionLinksFromCounts(locale, counts).map((link) => {
    const region = wineRegionBySlug(link.slug);
    return {
      href: link.href,
      label: link.label,
      count: region ? (counts.get(region.value) ?? 0) : 0,
    };
  });
  return rankMegaMenuRegions(ranked);
}

export function columnsFromCatalog(
  locale: AppLocale,
  catalog: ShopMenuCatalog | null,
): MegaMenuColumn[] {
  const shopLive = catalog ? catalog.shopLive : true;
  const colour = listedLinks(locale, COLOUR_SLUGS[locale], catalog);
  const grapes = listedLinks(locale, GRAPE_SLUGS[locale], catalog);
  const regions = regionLinks(locale, catalog);
  const boxesLive = catalog ? catalog.boxesLive : true;

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

/** Header mega menu. Empty or noindex categories are omitted. */
export async function getShopMegaMenu(): Promise<{
  sv: MegaMenuColumn[];
  en: MegaMenuColumn[];
}> {
  const catalog = await getShopMenuCatalog();
  return {
    sv: columnsFromCatalog("sv", catalog),
    en: columnsFromCatalog("en", catalog),
  };
}
