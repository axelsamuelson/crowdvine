import type { Metadata } from "next";

import { whatIsWhiteNaturalWineArticle } from "@/lib/guides/articles/what-is-white-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(whatIsWhiteNaturalWineArticle, "en");
}

export default function WhatIsWhiteNaturalWineGuidePage() {
  return renderArticleGuidePage(whatIsWhiteNaturalWineArticle, "en");
}
