import type { Metadata } from "next";

import { jeanFoillardArticle } from "@/lib/guides/articles/jean-foillard";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(jeanFoillardArticle, "en");
}

export default function JeanFoillardGuidePage() {
  return renderArticleGuidePage(jeanFoillardArticle, "en");
}
