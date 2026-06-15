import type { AppLocale } from "@/lib/i18n/locale";
import {
  getWineCategoryEn,
  getWineCategorySv,
  getHreflangPath,
} from "@/lib/wine-categories";
import {
  producerPublicPath,
  productPublicPath,
  producerShopPathFromName,
  shopPathForLocale,
} from "@/lib/i18n/localized-routes";

export type LocalizedPaths = {
  locale: AppLocale;
  shop: string;
  shopCollection: (slug: string) => string;
  shopCategory: (slug: string) => string;
  shopGroup: (groupId: string) => string;
  shopQuery: (params: Record<string, string>) => string;
  product: (handle: string) => string;
  producer: (slug: string) => string;
  producerShopFromName: (producerName: string) => string;
};

export function shopCategoryPath(slug: string, locale: AppLocale): string {
  if (locale === "sv") {
    const sv = getWineCategorySv(slug);
    if (sv) return sv.canonical ?? `/vin/${sv.slug}`;
    const en = getWineCategoryEn(slug);
    if (en?.hreflang) {
      const mapped = getWineCategorySv(en.hreflang);
      if (mapped) return mapped.canonical ?? `/vin/${mapped.slug}`;
    }
    return `/vin/${slug}`;
  }

  const en = getWineCategoryEn(slug);
  if (en) return en.canonical ?? `/wine/${en.slug}`;
  const sv = getWineCategorySv(slug);
  if (sv) return getHreflangPath(sv);
  return `/wine/${slug}`;
}

export function localizedPathsForLocale(locale: AppLocale): LocalizedPaths {
  const shop = shopPathForLocale(locale);
  return {
    locale,
    shop,
    shopCollection: (slug) => `${shop}/${slug}`,
    shopCategory: (slug) => shopCategoryPath(slug, locale),
    shopGroup: (groupId) => `${shop}/group/${groupId}`,
    shopQuery: (params) => {
      const qs = new URLSearchParams(params).toString();
      return qs ? `${shop}?${qs}` : shop;
    },
    product: (handle) => productPublicPath(handle, locale),
    producer: (slug) => producerPublicPath(slug, locale),
    producerShopFromName: (producerName) =>
      producerShopPathFromName(producerName, locale),
  };
}
