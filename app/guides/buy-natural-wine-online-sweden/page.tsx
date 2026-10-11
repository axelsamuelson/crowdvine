import type { Metadata } from "next";

import { buyNaturalWineOnlineSwedenArticle } from "@/lib/guides/articles/buy-natural-wine-online-sweden";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(buyNaturalWineOnlineSwedenArticle, "en");
}

export default function BuyNaturalWineOnlineSwedenGuidePage() {
  return renderArticleGuidePage(buyNaturalWineOnlineSwedenArticle, "en");
}
