import type { AppLocale } from "@/lib/i18n/locale";
import { getCachedNavigableShopFilterPaths } from "@/lib/shop/shop-filter-category-availability";
import {
  SHOP_MORE_STYLES_PILL_SLUGS_EN,
  SHOP_MORE_STYLES_PILL_SLUGS_SV,
  SHOP_ROOT_STYLE_PILL_SLUGS_EN,
  SHOP_ROOT_STYLE_PILL_SLUGS_SV,
  pillLinksFromSlugs,
  type StyleCategoryPillLink,
} from "@/lib/shop/style-category-links";

/** Server-only: style pills gated by the same live-wine check as the sitemap. */
export async function getShopRootStylePillLinks(
  locale: AppLocale,
  isB2BSite: boolean,
): Promise<StyleCategoryPillLink[]> {
  const paths = await getCachedNavigableShopFilterPaths(isB2BSite);
  const navigable = new Set(paths);
  const slugs =
    locale === "sv"
      ? SHOP_ROOT_STYLE_PILL_SLUGS_SV
      : SHOP_ROOT_STYLE_PILL_SLUGS_EN;
  return pillLinksFromSlugs(slugs, locale, navigable);
}

export async function getMoreStylesPillLinks(
  locale: AppLocale,
  isB2BSite: boolean,
): Promise<StyleCategoryPillLink[]> {
  const paths = await getCachedNavigableShopFilterPaths(isB2BSite);
  const navigable = new Set(paths);
  const slugs =
    locale === "sv"
      ? SHOP_MORE_STYLES_PILL_SLUGS_SV
      : SHOP_MORE_STYLES_PILL_SLUGS_EN;
  return pillLinksFromSlugs(slugs, locale, navigable);
}
