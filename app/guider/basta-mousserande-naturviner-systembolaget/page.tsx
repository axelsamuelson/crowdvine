import type { Metadata } from "next";

import { bestSparklingNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-sparkling-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestSparklingNaturalWinesSystembolagetArticle,
    "sv",
  );
}

export default function BastaMousserandeNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestSparklingNaturalWinesSystembolagetArticle,
    "sv",
    "sparkling",
  );
}
