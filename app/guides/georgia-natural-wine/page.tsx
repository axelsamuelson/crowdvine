import type { Metadata } from "next";

import { georgiaNaturalWineArticle } from "@/lib/guides/articles/georgia-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(georgiaNaturalWineArticle, "en");
}

export default function GeorgiaNaturalWineGuidePage() {
  return renderArticleGuidePage(georgiaNaturalWineArticle, "en");
}
