import type { Metadata } from "next";

import { bestNaturalWinesUnder200SystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-under-200-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestNaturalWinesUnder200SystembolagetArticle,
    "en",
  );
}

/**
 * EN route required for bilingual registry / hreflang.
 * Content uses Swedish interim copy until an English translation exists.
 */
export default function BestNaturalWinesUnder200SystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestNaturalWinesUnder200SystembolagetArticle,
    "en",
    "budget",
  );
}
