import type { Metadata } from "next";

import { bestSparklingNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-sparkling-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestSparklingNaturalWinesSystembolagetArticle,
    "en",
  );
}

export default function BestSparklingNaturalWinesSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestSparklingNaturalWinesSystembolagetArticle,
    "en",
    "sparkling",
  );
}
