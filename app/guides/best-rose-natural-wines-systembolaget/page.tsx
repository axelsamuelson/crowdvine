import type { Metadata } from "next";

import { bestRoseNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-rose-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestRoseNaturalWinesSystembolagetArticle,
    "en",
  );
}

export default function BestRoseNaturalWinesSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestRoseNaturalWinesSystembolagetArticle,
    "en",
    "rose",
  );
}
