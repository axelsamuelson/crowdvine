import type { Metadata } from "next";

import { juraNaturalWineArticle } from "@/lib/guides/articles/jura-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(juraNaturalWineArticle, "sv");
}

export default function JuraNaturalWineGuidePageSv() {
  return renderArticleGuidePage(juraNaturalWineArticle, "sv");
}
