import type { Metadata } from "next";

import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(whatIsPetNatArticle, "en");
}

export default function WhatIsPetNatGuidePage() {
  return renderArticleGuidePage(whatIsPetNatArticle, "en");
}
