import type { Metadata } from "next";

import { languedocNaturalWineArticle } from "@/lib/guides/articles/languedoc-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(languedocNaturalWineArticle, "sv");
}

export default function LanguedocNaturalWineGuidePageSv() {
  return renderArticleGuidePage(languedocNaturalWineArticle, "sv");
}
