import type { Metadata } from "next";

import { beaujolaisNaturalWineArticle } from "@/lib/guides/articles/beaujolais-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(beaujolaisNaturalWineArticle, "sv");
}

export default function BeaujolaisNaturalWineGuidePageSv() {
  return renderArticleGuidePage(beaujolaisNaturalWineArticle, "sv");
}
