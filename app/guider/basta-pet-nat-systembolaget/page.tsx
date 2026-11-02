import type { Metadata } from "next";

import { bestPetNatWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(
    bestPetNatWinesSystembolagetSvArticle,
    "sv",
  );
}

export default function BastaPetNatSystembolagetGuidePage() {
  return renderArticleGuidePage(
    bestPetNatWinesSystembolagetSvArticle,
    "sv",
  );
}
