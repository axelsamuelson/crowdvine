import type { Metadata } from "next";

import { bestOrangeNaturalWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(
    bestOrangeNaturalWinesSystembolagetSvArticle,
    "sv",
  );
}

export default function BastaOrangeNaturvinerSystembolagetGuidePage() {
  return renderArticleGuidePage(
    bestOrangeNaturalWinesSystembolagetSvArticle,
    "sv",
  );
}
