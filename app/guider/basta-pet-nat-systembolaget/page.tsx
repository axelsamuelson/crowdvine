import type { Metadata } from "next";

import { bestPetNatWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const meta = await buildArticleGuideMetadata(
    bestPetNatWinesSystembolagetSvArticle,
    "sv",
  );
  // Exact <title>; absolute bypasses root layout `%s | ${siteName}` template.
  const title = "Bästa pet nat på Systembolaget – vårt urval | PACT";
  return {
    ...meta,
    title: { absolute: title },
  };
}

export default function BastaPetNatSystembolagetGuidePage() {
  return renderArticleGuidePage(
    bestPetNatWinesSystembolagetSvArticle,
    "sv",
  );
}
