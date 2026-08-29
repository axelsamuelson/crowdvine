import type { Metadata } from "next";

import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(joskoGravnerArticle, "sv");
}

export default function JoskoGravnerGuidePageSv() {
  return renderArticleGuidePage(joskoGravnerArticle, "sv");
}
