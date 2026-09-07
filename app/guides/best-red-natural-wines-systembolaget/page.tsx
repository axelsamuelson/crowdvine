import type { Metadata } from "next";

import { bestRedNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-red-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestRedNaturalWinesSystembolagetArticle,
    "en",
  );
}

export default function BestRedNaturalWinesSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestRedNaturalWinesSystembolagetArticle,
    "en",
    "red",
  );
}
