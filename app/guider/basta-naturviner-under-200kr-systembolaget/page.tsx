import type { Metadata } from "next";

import { bestNaturalWinesUnder200SystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-under-200-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestNaturalWinesUnder200SystembolagetArticle,
    "sv",
  );
}

export default function BastaNaturvinerUnder200SystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestNaturalWinesUnder200SystembolagetArticle,
    "sv",
    "budget",
  );
}
