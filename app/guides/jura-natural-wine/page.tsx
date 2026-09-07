import type { Metadata } from "next";

import { juraNaturalWineArticle } from "@/lib/guides/articles/jura-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(juraNaturalWineArticle, "en");
}

export default function JuraNaturalWineGuidePage() {
  return renderArticleGuidePage(juraNaturalWineArticle, "en");
}
