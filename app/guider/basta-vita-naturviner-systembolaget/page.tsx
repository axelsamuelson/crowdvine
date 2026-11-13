import type { Metadata } from "next";

import { bestWhiteNaturalWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-white-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestWhiteNaturalWinesSystembolagetSvArticle,
    "sv",
  );
}

export default function BastaVitaNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestWhiteNaturalWinesSystembolagetSvArticle,
    "sv",
    "white",
  );
}
