import type { Metadata } from "next";

import { bestRedNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-red-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestRedNaturalWinesSystembolagetArticle,
    "sv",
  );
}

export default function BastaRodaNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestRedNaturalWinesSystembolagetArticle,
    "sv",
    "red",
  );
}
