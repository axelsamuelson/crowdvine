import type { Metadata } from "next";

import { georgiaNaturalWineArticle } from "@/lib/guides/articles/georgia-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(georgiaNaturalWineArticle, "sv");
}

export default function GeorgiaNaturalWineGuidePageSv() {
  return renderArticleGuidePage(georgiaNaturalWineArticle, "sv");
}
