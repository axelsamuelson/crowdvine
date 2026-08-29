import type { Metadata } from "next";

import { whatIsOrangeWineArticle } from "@/lib/guides/articles/what-is-orange-wine";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(whatIsOrangeWineArticle, "sv");
}

export default function VadArOrangeVinGuidePage() {
  return renderArticleGuidePage(whatIsOrangeWineArticle, "sv");
}
