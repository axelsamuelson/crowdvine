import type { Metadata } from "next";

import {
  articlePath,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";

export function articleGuideHreflang(
  content: GuideArticleContent,
  baseUrl: string,
  /** Default locale for unmatched language preferences. */
  xDefault: AppLocale = "en",
) {
  const sv = `${baseUrl}${articlePath(content, "sv")}`;
  const en = `${baseUrl}${articlePath(content, "en")}`;
  return {
    sv,
    en,
    // Most bilingual articles: EN as x-default (international ranking).
    // Sweden-specific topics (e.g. Systembolaget) should pass xDefault: "sv".
    "x-default": xDefault === "sv" ? sv : en,
  } as const;
}

/**
 * Sweden-intent guides: Systembolaget, buying in Sweden, Stockholm home delivery.
 * Prefer SV as x-default so unmatched language preferences land on the local page.
 */
export function isSwedenFirstGuideArticle(
  content: Pick<GuideArticleContent, "slug">,
): boolean {
  const en = content.slug.en.toLowerCase();
  const sv = content.slug.sv.toLowerCase();
  return (
    en.includes("systembolaget") ||
    sv.includes("systembolaget") ||
    en.includes("sweden") ||
    sv.includes("sverige") ||
    en === "natural-wine-home-delivery" ||
    sv === "hemleverans-av-naturvin"
  );
}

export function buildArticleGuideMeta(
  content: GuideArticleContent,
  locale: AppLocale,
  baseUrl: string,
  siteName: string,
  options?: {
    xDefault?: AppLocale;
    /** When EN copy is still a Swedish placeholder. follow stays true. */
    noindex?: boolean;
    /** Unpublished guides: noindex and nofollow. */
    nofollow?: boolean;
  },
): Metadata {
  const pageUrl = `${baseUrl}${articlePath(content, locale)}`;
  const title = categoryPageTitle(content.title[locale], siteName);
  const description = content.meta[locale];
  const robots = options?.nofollow
    ? { index: false as const, follow: false as const }
    : options?.noindex
    ? { index: false as const, follow: true as const }
    : undefined;
  const xDefault =
    options?.xDefault ??
    (isSwedenFirstGuideArticle(content) ? "sv" : "en");

  return {
    title,
    description,
    ...(robots ? { robots } : {}),
    alternates: {
      canonical: pageUrl,
      languages: articleGuideHreflang(content, baseUrl, xDefault),
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "article",
      locale: locale === "sv" ? "sv_SE" : "en_US",
      images: defaultOpenGraphImages({ siteName, locale }),
    },
    twitter: pageTwitterCard(title, description),
  };
}
