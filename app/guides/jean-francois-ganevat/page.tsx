import type { Metadata } from "next";

import { jeanFrancoisGanevatArticle } from "@/lib/guides/articles/jean-francois-ganevat";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(jeanFrancoisGanevatArticle, "en");
}

export default function JeanFrancoisGanevatGuidePage() {
  return renderArticleGuidePage(jeanFrancoisGanevatArticle, "en");
}
