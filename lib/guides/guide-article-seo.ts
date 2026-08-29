import type { Metadata } from "next";

import {
  articlePath,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";

export function articleGuideHreflang(
  content: GuideArticleContent,
  baseUrl: string,
) {
  const sv = `${baseUrl}${articlePath(content, "sv")}`;
  const en = `${baseUrl}${articlePath(content, "en")}`;
  return {
    sv,
    en,
    "x-default": sv,
  } as const;
}

export function buildArticleGuideMeta(
  content: GuideArticleContent,
  locale: AppLocale,
  baseUrl: string,
  siteName: string,
): Metadata {
  const pageUrl = `${baseUrl}${articlePath(content, locale)}`;
  const title = categoryPageTitle(content.title[locale], siteName);
  const description = content.meta[locale];

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: articleGuideHreflang(content, baseUrl),
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "article",
      locale: locale === "sv" ? "sv_SE" : "en_US",
    },
  };
}
