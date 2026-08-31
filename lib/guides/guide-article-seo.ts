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

export function buildArticleGuideMeta(
  content: GuideArticleContent,
  locale: AppLocale,
  baseUrl: string,
  siteName: string,
  options?: { xDefault?: AppLocale },
): Metadata {
  const pageUrl = `${baseUrl}${articlePath(content, locale)}`;
  const title = categoryPageTitle(content.title[locale], siteName);
  const description = content.meta[locale];

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: articleGuideHreflang(
        content,
        baseUrl,
        options?.xDefault ?? "en",
      ),
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
