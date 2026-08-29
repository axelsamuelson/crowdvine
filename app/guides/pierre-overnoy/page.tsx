import type { Metadata } from "next";

import { pierreOvernoyArticle } from "@/lib/guides/articles/pierre-overnoy";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(pierreOvernoyArticle, "en");
}

export default function PierreOvernoyGuidePage() {
  return renderArticleGuidePage(pierreOvernoyArticle, "en");
}
