import type { Metadata } from "next";

import { gangOfFourWineArticle } from "@/lib/guides/articles/gang-of-four-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(gangOfFourWineArticle, "en");
}

export default function GangOfFourWineGuidePage() {
  return renderArticleGuidePage(gangOfFourWineArticle, "en");
}
