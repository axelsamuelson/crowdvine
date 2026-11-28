import { unstable_cache } from "next/cache";

import { catalogHasProducts } from "@/lib/crowdvine/products-data";
import type { AppLocale } from "@/lib/i18n/locale";
import { PRODUCER_BOXES_PUBLISHED } from "@/lib/producer-boxes/config";
import { loadResolvedProducerBoxes } from "@/lib/producer-boxes/load";
import {
  getWineCategoryEn,
  getWineCategorySv,
  wineCategoryCatalogFilters,
} from "@/lib/wine-categories";

export type ShopNavLink = {
  href: string;
  label: string;
};

type ShopNavEntry = ShopNavLink & {
  slug?: string;
  boxes?: boolean;
};

/** Swedish header/mobile submenu, in display order. */
export const SHOP_NAV_SUBMENU_SV: readonly ShopNavEntry[] = [
  { href: "/vin/rott-naturvin", label: "Rött naturvin", slug: "rott-naturvin" },
  { href: "/vin/vitt-naturvin", label: "Vitt naturvin", slug: "vitt-naturvin" },
  {
    href: "/vin/orange-naturvin",
    label: "Orange vin",
    slug: "orange-naturvin",
  },
  {
    href: "/vin/mousserande-vin",
    label: "Mousserande vin",
    slug: "mousserande-vin",
  },
  { href: "/vin/pet-nat", label: "Pet nat", slug: "pet-nat" },
  { href: "/vin/naturvin-lada", label: "Naturvinslåda", boxes: true },
];

/** English header/mobile submenu. Slugs are the live shop paths. */
export const SHOP_NAV_SUBMENU_EN: readonly ShopNavEntry[] = [
  {
    href: "/wine/red-natural-wine",
    label: "Red natural wine",
    slug: "red-natural-wine",
  },
  {
    href: "/wine/white-natural-wine",
    label: "White natural wine",
    slug: "white-natural-wine",
  },
  {
    href: "/wine/orange-natural-wine",
    label: "Orange wine",
    slug: "orange-natural-wine",
  },
  {
    href: "/wine/sparkling-wine",
    label: "Sparkling wine",
    slug: "sparkling-wine",
  },
  { href: "/wine/pet-nat", label: "Pet nat", slug: "pet-nat" },
  {
    href: "/wine/natural-wine-box",
    label: "Natural wine box",
    boxes: true,
  },
];

async function boxesHaveLiveWines(): Promise<boolean> {
  if (!PRODUCER_BOXES_PUBLISHED) return false;
  try {
    const { boxes, loadError } = await loadResolvedProducerBoxes();
    if (loadError) return true;
    return boxes.some((box) => box.purchasable);
  } catch (error) {
    console.error("[shop-submenu] producer boxes", error);
    return true;
  }
}

async function entryIsLive(
  entry: ShopNavEntry,
  locale: AppLocale,
): Promise<boolean> {
  if (entry.boxes) return boxesHaveLiveWines();
  const category =
    locale === "sv"
      ? getWineCategorySv(entry.slug ?? "")
      : getWineCategoryEn(entry.slug ?? "");
  if (!category) return false;
  try {
    return await catalogHasProducts({
      ...wineCategoryCatalogFilters(category.filter),
      isB2BSite: false,
    });
  } catch (error) {
    console.error("[shop-submenu] catalog", entry.href, error);
    return true;
  }
}

async function liveLinks(
  entries: readonly ShopNavEntry[],
  locale: AppLocale,
): Promise<ShopNavLink[]> {
  const flags = await Promise.all(
    entries.map((entry) => entryIsLive(entry, locale)),
  );
  return entries
    .filter((_, index) => flags[index])
    .map(({ href, label }) => ({ href, label }));
}

async function computeShopNavSubmenu(): Promise<{
  sv: ShopNavLink[];
  en: ShopNavLink[];
}> {
  const [sv, en] = await Promise.all([
    liveLinks(SHOP_NAV_SUBMENU_SV, "sv"),
    liveLinks(SHOP_NAV_SUBMENU_EN, "en"),
  ]);
  return { sv, en };
}

/** Category links for the shop nav. Empty categories are omitted. */
export function getShopNavSubmenu(): Promise<{
  sv: ShopNavLink[];
  en: ShopNavLink[];
}> {
  return unstable_cache(computeShopNavSubmenu, ["shop-nav-submenu-v1"], {
    revalidate: 300,
  })();
}
