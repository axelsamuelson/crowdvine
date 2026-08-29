import type { GuideArticleContent } from "@/lib/guides/guide-types";
import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { whatIsOrangeWineArticle } from "@/lib/guides/articles/what-is-orange-wine";

/**
 * Registry of bilingual article guides.
 * Sitemap + future hub helpers iterate this list.
 * Add new articles here when they ship in both locales.
 */
export const BILINGUAL_ARTICLE_GUIDES: readonly GuideArticleContent[] = [
  joskoGravnerArticle,
  whatIsOrangeWineArticle,
  whatIsNaturalWineArticle,
];
