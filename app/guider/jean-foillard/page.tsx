import type { Metadata } from "next";

import { jeanFoillardArticle } from "@/lib/guides/articles/jean-foillard";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(jeanFoillardArticle, "sv");
}

export default function JeanFoillardGuidePageSv() {
  return renderArticleGuidePage(jeanFoillardArticle, "sv");
}
