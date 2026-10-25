import type { Metadata } from "next";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import type { SiteConfig } from "@/lib/site-config";
import { DIRTY_WINE_CONFIG } from "@/lib/site-config";
import { shopCategoryCanonicalUrl } from "@/lib/wine-category-canonical";
import { localizeGeneratedCategoryCopy } from "@/lib/wine-shop-filter-categories";
import { resolveGrapeCategoryBySlug } from "@/lib/wine-grape-categories";
import {
  STOCKHOLM_DELIVERY_PATH,
  STOCKHOLM_DELIVERY_SLUG,
  stockholmDeliveryLandingCopy,
} from "@/lib/stockholm-delivery-landing/config";

export async function buildStockholmDeliveryMetadata(
  locale: AppLocale,
  config: SiteConfig,
): Promise<Metadata> {
  const slug = STOCKHOLM_DELIVERY_SLUG[locale];
  const category = await resolveGrapeCategoryBySlug(slug, locale);
  const isDirty = config.baseUrl === DIRTY_WINE_CONFIG.baseUrl;
  const copy = stockholmDeliveryLandingCopy(locale, isDirty);

  const pageUrl = `${config.baseUrl}${STOCKHOLM_DELIVERY_PATH[locale]}`;
  const canonicalUrl = category
    ? shopCategoryCanonicalUrl(slug, locale, config.baseUrl)
    : pageUrl;

  const rawTitle =
    category?.title ??
    (locale === "sv"
      ? "Naturvin hemleverans Stockholm — beställ online | PACT Wines"
      : "Natural Wine Home Delivery Stockholm — Order Online | PACT Wines");
  const title = categoryPageTitle(rawTitle, config.siteName);

  const metaDescription = category
    ? localizeGeneratedCategoryCopy(category, config.siteName, isDirty)
        .metaDescription
    : copy.heroSupport;

  return {
    title,
    description: metaDescription,
    robots: { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        sv: `${config.baseUrl}${STOCKHOLM_DELIVERY_PATH.sv}`,
        en: `${config.baseUrl}${STOCKHOLM_DELIVERY_PATH.en}`,
        "x-default": `${config.baseUrl}${STOCKHOLM_DELIVERY_PATH.en}`,
      },
    },
    openGraph: {
      title: rawTitle,
      description: metaDescription,
      url: canonicalUrl,
      type: "website",
      images: defaultOpenGraphImages({ siteName: config.siteName }),
    },
    twitter: pageTwitterCard(rawTitle, metaDescription),
  };
}

export function buildStockholmDeliveryJsonLd(
  locale: AppLocale,
  config: SiteConfig,
  isDirtyWine: boolean,
): {
  webpage: Record<string, unknown>;
  breadcrumb: Record<string, unknown>;
  faq: Record<string, unknown>;
} {
  const copy = stockholmDeliveryLandingCopy(locale, isDirtyWine);
  const pageUrl = `${config.baseUrl}${STOCKHOLM_DELIVERY_PATH[locale]}`;
  const shopUrl = `${config.baseUrl}${locale === "sv" ? "/vin" : "/wine"}`;
  const shopName = locale === "sv" ? "Naturvin" : "Natural wine";

  return {
    webpage: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: copy.h1,
      description: copy.heroSupport,
      url: pageUrl,
      isPartOf: {
        "@type": "WebSite",
        name: config.siteName,
        url: config.baseUrl,
      },
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: shopName,
          item: shopUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: copy.h1,
          item: pageUrl,
        },
      ],
    },
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: copy.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  };
}
