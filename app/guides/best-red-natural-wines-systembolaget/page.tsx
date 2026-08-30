import type { Metadata } from "next";

import { bestRedNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-red-natural-wines-systembolaget";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";
import { withLiveRedSystembolagetWines } from "@/lib/guides/systembolaget-red-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(
    bestRedNaturalWinesSystembolagetArticle,
    "en",
  );
}

export default async function BestRedNaturalWinesSystembolagetGuidePage() {
  const content = await withLiveRedSystembolagetWines(
    bestRedNaturalWinesSystembolagetArticle,
  );
  return renderArticleGuidePage(content, "en");
}
