import type { Metadata } from "next";

import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(whatIsNaturalWineArticle, "en");
}

export default function WhatIsNaturalWineGuidePage() {
  return renderArticleGuidePage(whatIsNaturalWineArticle, "en");
}
