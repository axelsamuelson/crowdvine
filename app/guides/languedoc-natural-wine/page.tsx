import type { Metadata } from "next";

import { languedocNaturalWineArticle } from "@/lib/guides/articles/languedoc-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(languedocNaturalWineArticle, "en");
}

export default function LanguedocNaturalWineGuidePageEn() {
  return renderArticleGuidePage(languedocNaturalWineArticle, "en");
}
