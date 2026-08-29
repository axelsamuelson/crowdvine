import type { Metadata } from "next";

import { marcelLapierreArticle } from "@/lib/guides/articles/marcel-lapierre";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(marcelLapierreArticle, "sv");
}

export default function MarcelLapierreGuidePageSv() {
  return renderArticleGuidePage(marcelLapierreArticle, "sv");
}
