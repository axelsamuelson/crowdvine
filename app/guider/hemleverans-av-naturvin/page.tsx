import type { Metadata } from "next";

import { naturalWineHomeDeliveryArticle } from "@/lib/guides/articles/natural-wine-home-delivery";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(naturalWineHomeDeliveryArticle, "sv");
}

export default function HemleveransAvNaturvinGuidePage() {
  return renderArticleGuidePage(naturalWineHomeDeliveryArticle, "sv");
}
