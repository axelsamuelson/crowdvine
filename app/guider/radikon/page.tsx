import type { Metadata } from "next";

import { radikonArticle } from "@/lib/guides/articles/radikon";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(radikonArticle, "sv");
}

export default function RadikonGuidePageSv() {
  return renderArticleGuidePage(radikonArticle, "sv");
}
