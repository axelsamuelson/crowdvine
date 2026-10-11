import type { Metadata } from "next";

import { bestNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestNaturalWinesSystembolagetArticle,
    "sv",
  );
}

export default function BastaNaturvinernaPaSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestNaturalWinesSystembolagetArticle,
    "sv",
    "best",
  );
}
