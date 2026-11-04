import type { Metadata } from "next";

import { bestOrangeNaturalWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestOrangeNaturalWinesSystembolagetSvArticle,
    "sv",
  );
}

export default function BastaOrangeNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestOrangeNaturalWinesSystembolagetSvArticle,
    "sv",
    "orange",
  );
}
