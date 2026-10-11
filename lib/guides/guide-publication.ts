import { BILINGUAL_ARTICLE_GUIDES } from "@/lib/guides/bilingual-article-guides";
import {
  articlePath,
  isGuideArticlePublished,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";

/** Registry entries that belong in the sitemap, hub, and inbound links. */
export function publishedBilingualArticleGuides(): readonly GuideArticleContent[] {
  return BILINGUAL_ARTICLE_GUIDES.filter(isGuideArticlePublished);
}

/**
 * False when href is a direct path of a guide with published: false.
 * Other hrefs, including shop and external URLs, stay linkable.
 */
export function isIndexableGuideHref(href: string): boolean {
  for (const guide of BILINGUAL_ARTICLE_GUIDES) {
    if (isGuideArticlePublished(guide)) continue;
    if (
      href === articlePath(guide, "en") ||
      href === articlePath(guide, "sv")
    ) {
      return false;
    }
  }
  return true;
}
