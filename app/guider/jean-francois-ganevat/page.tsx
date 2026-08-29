import type { Metadata } from "next";

import { jeanFrancoisGanevatArticle } from "@/lib/guides/articles/jean-francois-ganevat";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(jeanFrancoisGanevatArticle, "sv");
}

export default function JeanFrancoisGanevatGuidePageSv() {
  return renderArticleGuidePage(jeanFrancoisGanevatArticle, "sv");
}
