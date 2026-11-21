import { beaujolaisNaturalWineArticle } from "@/lib/guides/articles/beaujolais-natural-wine";
import { gangOfFourWineArticle } from "@/lib/guides/articles/gang-of-four-wine";
import { guyBretonArticle } from "@/lib/guides/articles/guy-breton";
import { jacquesSelosseArticle } from "@/lib/guides/articles/jacques-selosse";
import { jeanFoillardArticle } from "@/lib/guides/articles/jean-foillard";
import { jeanFrancoisGanevatArticle } from "@/lib/guides/articles/jean-francois-ganevat";
import { jeanPaulThevenetArticle } from "@/lib/guides/articles/jean-paul-thevenet";
import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import { juraNaturalWineArticle } from "@/lib/guides/articles/jura-natural-wine";
import { marcelLapierreArticle } from "@/lib/guides/articles/marcel-lapierre";
import { pierreOvernoyArticle } from "@/lib/guides/articles/pierre-overnoy";
import { radikonArticle } from "@/lib/guides/articles/radikon";
import { thierryAllemandArticle } from "@/lib/guides/articles/thierry-allemand";
import { guideCopy } from "@/lib/guides/guide-copy";
import { GUIDE_PATHS, guidePath } from "@/lib/guides/guide-routes";
import { articlePath, type GuideArticleContent } from "@/lib/guides/guide-types";
import { producerGuidePath } from "@/lib/guides/producer-guide-links";
import { worldsBestOrangeWinesGuide } from "@/lib/guides/worlds-best-orange-wines";
import type { AppLocale } from "@/lib/i18n/locale";

const PRODUCER_PROFILE_ARTICLES: readonly GuideArticleContent[] = [
  pierreOvernoyArticle,
  thierryAllemandArticle,
  joskoGravnerArticle,
  jeanFrancoisGanevatArticle,
  jacquesSelosseArticle,
  radikonArticle,
  jeanFoillardArticle,
  marcelLapierreArticle,
  guyBretonArticle,
  jeanPaulThevenetArticle,
  gangOfFourWineArticle,
];

const REGION_ARTICLES: readonly GuideArticleContent[] = [
  beaujolaisNaturalWineArticle,
  juraNaturalWineArticle,
];

/**
 * Full page title for a public guide path (prefer H1, never invent copy).
 */
export function guidePageTitleForPath(
  path: string,
  locale: AppLocale,
): string | null {
  const normalized = path.replace(/\/$/, "") || path;
  const copy = guideCopy(locale);

  if (
    normalized === GUIDE_PATHS.producers.sv ||
    normalized === GUIDE_PATHS.producers.en
  ) {
    return copy.producers.h1;
  }
  if (
    normalized === GUIDE_PATHS.wines.sv ||
    normalized === GUIDE_PATHS.wines.en
  ) {
    return copy.wines.h1;
  }
  if (
    normalized === GUIDE_PATHS.orangeWines.sv ||
    normalized === GUIDE_PATHS.orangeWines.en
  ) {
    return worldsBestOrangeWinesGuide.h1[locale];
  }

  for (const article of [...PRODUCER_PROFILE_ARTICLES, ...REGION_ARTICLES]) {
    if (
      articlePath(article, "sv") === normalized ||
      articlePath(article, "en") === normalized
    ) {
      return article.h1[locale] || article.title[locale] || null;
    }
  }

  return null;
}

export function producerProfileGuideTitle(
  slug: string,
  locale: AppLocale,
): string | null {
  return guidePageTitleForPath(producerGuidePath(slug, locale), locale);
}

export function topListGuideTitle(
  kind: "producers" | "wines" | "orangeWines",
  locale: AppLocale,
): string {
  return guidePageTitleForPath(guidePath(kind, locale), locale) ?? guidePath(kind, locale);
}
