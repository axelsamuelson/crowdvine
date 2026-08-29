import type { Metadata } from "next";

import { whatIsRedNaturalWineArticle } from "@/lib/guides/articles/what-is-red-natural-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(whatIsRedNaturalWineArticle, "sv");
}

export default function VadArRottNaturvinGuidePage() {
  return renderArticleGuidePage(whatIsRedNaturalWineArticle, "sv");
}
