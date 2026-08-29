import type { Metadata } from "next";

import { radikonArticle } from "@/lib/guides/articles/radikon";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(radikonArticle, "en");
}

export default function RadikonGuidePage() {
  return renderArticleGuidePage(radikonArticle, "en");
}
