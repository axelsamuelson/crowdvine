import type { AppLocale } from "@/lib/i18n/locale";
import { getShopMenuCatalog, countWinesForFilter, type ShopMenuCatalog } from "@/lib/nav/shop-menu-catalog";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";

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

function entryIsLive(
  entry: ShopNavEntry,
  locale: AppLocale,
  catalog: ShopMenuCatalog | null,
): boolean {
  if (entry.boxes) return catalog ? catalog.boxesLive : true;
  const category =
    locale === "sv"
      ? getWineCategorySv(entry.slug ?? "")
      : getWineCategoryEn(entry.slug ?? "");
  if (!category) return false;
  if (!catalog) return true;
  return countWinesForFilter(catalog.wines, category.filter) > 0;
}

function liveLinks(
  entries: readonly ShopNavEntry[],
  locale: AppLocale,
  catalog: ShopMenuCatalog | null,
): ShopNavLink[] {
  return entries
    .filter((entry) => entryIsLive(entry, locale, catalog))
    .map(({ href, label }) => ({ href, label }));
}

/** Category links for the shop nav. Empty categories are omitted. */
export async function getShopNavSubmenu(): Promise<{
  sv: ShopNavLink[];
  en: ShopNavLink[];
}> {
  const catalog = await getShopMenuCatalog();
  return {
    sv: liveLinks(SHOP_NAV_SUBMENU_SV, "sv", catalog),
    en: liveLinks(SHOP_NAV_SUBMENU_EN, "en", catalog),
  };
}
