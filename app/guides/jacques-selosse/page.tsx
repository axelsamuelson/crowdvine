import type { Metadata } from "next";

import { jacquesSelosseArticle } from "@/lib/guides/articles/jacques-selosse";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(jacquesSelosseArticle, "en");
}

export default function JacquesSelosseGuidePage() {
  return renderArticleGuidePage(jacquesSelosseArticle, "en");
}
