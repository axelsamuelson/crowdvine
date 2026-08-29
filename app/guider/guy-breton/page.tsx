import type { Metadata } from "next";

import { guyBretonArticle } from "@/lib/guides/articles/guy-breton";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(guyBretonArticle, "sv");
}

export default function GuyBretonGuidePageSv() {
  return renderArticleGuidePage(guyBretonArticle, "sv");
}
