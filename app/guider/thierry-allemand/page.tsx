import type { Metadata } from "next";

import { thierryAllemandArticle } from "@/lib/guides/articles/thierry-allemand";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(thierryAllemandArticle, "sv");
}

export default function ThierryAllemandGuidePageSv() {
  return renderArticleGuidePage(thierryAllemandArticle, "sv");
}
