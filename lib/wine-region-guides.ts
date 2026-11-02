/**
 * Resolve the editorial guide linked from a wine region landing page.
 * Guides declare ownership via `wineRegionSlug`; Roussillon shares Languedoc.
 */

import { BILINGUAL_ARTICLE_GUIDES } from "@/lib/guides/bilingual-article-guides";
import {
  articlePath,
  isGuideArticlePublished,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";
import { guidePath } from "@/lib/guides/guide-routes";
import { worldsBestNaturalChampagneGuide } from "@/lib/guides/worlds-best-natural-champagne";
import type { AppLocale } from "@/lib/i18n/locale";
import type { WineRegionSlug } from "@/lib/wine-regions";

/** Region slugs that reuse another region's guide (no dedicated article). */
const REGION_GUIDE_SLUG_ALIASES: Partial<
  Record<WineRegionSlug, WineRegionSlug>
> = {
  roussillon: "languedoc",
};

export function wineRegionGuideLookupSlug(
  slug: WineRegionSlug,
): WineRegionSlug {
  return REGION_GUIDE_SLUG_ALIASES[slug] ?? slug;
}

export function getWineRegionGuideArticle(
  slug: WineRegionSlug,
): GuideArticleContent | null {
  const lookup = wineRegionGuideLookupSlug(slug);
  return (
    BILINGUAL_ARTICLE_GUIDES.find(
      (guide) =>
        isGuideArticlePublished(guide) && guide.wineRegionSlug === lookup,
    ) ?? null
  );
}

export function getWineRegionGuideHref(
  slug: WineRegionSlug,
  locale: AppLocale,
): string | null {
  if (slug === "champagne") {
    return guidePath("naturalChampagne", locale);
  }
  const article = getWineRegionGuideArticle(slug);
  return article ? articlePath(article, locale) : null;
}

export function getWineRegionGuideLabel(
  slug: WineRegionSlug,
  locale: AppLocale,
): string | null {
  if (slug === "champagne") {
    return worldsBestNaturalChampagneGuide.breadcrumbShort[locale];
  }
  const article = getWineRegionGuideArticle(slug);
  return article?.breadcrumbShort[locale] ?? null;
}
