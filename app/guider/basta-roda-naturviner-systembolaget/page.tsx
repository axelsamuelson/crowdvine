import type { Metadata } from "next";

import { bestRedNaturalWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-red-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestRedNaturalWinesSystembolagetSvArticle,
    "sv",
  );
}

export default function BastaRodaNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestRedNaturalWinesSystembolagetSvArticle,
    "sv",
    "red",
  );
}
