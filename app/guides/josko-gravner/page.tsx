import type { Metadata } from "next";

import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(joskoGravnerArticle, "en");
}

export default function JoskoGravnerGuidePage() {
  return renderArticleGuidePage(joskoGravnerArticle, "en");
}
