import type { Metadata } from "next";

import { jeanPaulThevenetArticle } from "@/lib/guides/articles/jean-paul-thevenet";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(jeanPaulThevenetArticle, "sv");
}

export default function JeanPaulThevenetGuidePageSv() {
  return renderArticleGuidePage(jeanPaulThevenetArticle, "sv");
}
