import type { Metadata } from "next";

import { bestRoseNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-rose-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestRoseNaturalWinesSystembolagetArticle,
    "sv",
  );
}

export default function BastaRoseNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestRoseNaturalWinesSystembolagetArticle,
    "sv",
    "rose",
  );
}
