import type { Metadata } from "next";

import { jeanPaulThevenetArticle } from "@/lib/guides/articles/jean-paul-thevenet";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(jeanPaulThevenetArticle, "en");
}

export default function JeanPaulThevenetGuidePage() {
  return renderArticleGuidePage(jeanPaulThevenetArticle, "en");
}
