import type { Metadata } from "next";

import { bestWhiteNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-white-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestWhiteNaturalWinesSystembolagetArticle,
    "sv",
  );
}

export default function BastaVitaNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestWhiteNaturalWinesSystembolagetArticle,
    "sv",
    "white",
  );
}
