import { aboutPathForLocale } from "@/lib/i18n/about-page-content";
import type { AppLocale } from "@/lib/i18n/locale";
import { producersDirectoryPathForLocale } from "@/lib/i18n/producers-directory";
import {
  getWineCategoryEn,
  getWineCategorySv,
  getHreflangPath,
  getWineCategoryFromPathname,
} from "@/lib/wine-categories";
import { GUIDE_PATHS, guidePath } from "@/lib/guides/guide-routes";
import {
  homePathForLocale,
  producerPublicPath,
  productPublicPath,
  producerShopPathFromName,
  shopPathForLocale,
} from "@/lib/i18n/localized-routes";

export type LocalizedPaths = {
  locale: AppLocale;
  home: "/" | "/en";
  about: string;
  producers: string;
  guides: string;
  shop: string;
  shopCollection: (slug: string) => string;
  shopCategory: (slug: string) => string;
  shopGroup: (groupId: string) => string;
  shopQuery: (params: Record<string, string>) => string;
  product: (handle: string) => string;
  producer: (slug: string) => string;
  producerShopFromName: (producerName: string) => string;
};

/**
 * Matching page in the other language. Unknown guide or category slugs
 * fall back to that language's homepage. Does not invent /us or /gb paths.
 */
export function alternateLanguagePath(
  pathname: string,
  locale: AppLocale,
): string {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  if (path === "/" || path === "/en") return homePathForLocale(locale);

  const product = path.match(/^\/(product|produkt)\/([^/]+)\/?$/);
  if (product) return productPublicPath(decodeURIComponent(product[2]), locale);

  const producer = path.match(/^\/(producers|producenter)\/([^/]+)\/?$/);
  if (producer) return producerPublicPath(decodeURIComponent(producer[2]), locale);
  if (path === "/producers" || path === "/producenter") {
    return locale === "sv" ? "/producenter" : "/producers";
  }

  if (path === "/guider" || path === "/guides") {
    return locale === "sv" ? "/guider" : "/guides";
  }
  if (path.startsWith("/guider/") || path.startsWith("/guides/")) {
    for (const pair of Object.values(GUIDE_PATHS)) {
      if (pair.sv === path || pair.en === path) return pair[locale];
    }
    return homePathForLocale(locale);
  }

  if (path === "/vin" || path === "/wine") return shopPathForLocale(locale);
  if (path.startsWith("/vin/") || path.startsWith("/wine/")) {
    const category = getWineCategoryFromPathname(path);
    if (category?.hreflang) return getHreflangPath(category);
    if (category) return homePathForLocale(locale);
    const slug = path.split("/").filter(Boolean)[1] ?? "";
    return `${shopPathForLocale(locale)}/${slug}`;
  }

  return homePathForLocale(locale);
}

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
    home: homePathForLocale(locale),
    about: aboutPathForLocale(locale),
    producers: producersDirectoryPathForLocale(locale),
    guides: guidePath("hub", locale),
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
