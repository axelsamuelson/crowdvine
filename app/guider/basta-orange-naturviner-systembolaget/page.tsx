import type { Metadata } from "next";

import { bestOrangeNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestOrangeNaturalWinesSystembolagetArticle,
    "sv",
  );
}

export default function BastaOrangeNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestOrangeNaturalWinesSystembolagetArticle,
    "sv",
    "orange",
  );
}
