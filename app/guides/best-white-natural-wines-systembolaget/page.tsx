import type { Metadata } from "next";

import { bestWhiteNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-white-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestWhiteNaturalWinesSystembolagetArticle,
    "en",
  );
}

export default function BestWhiteNaturalWinesSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestWhiteNaturalWinesSystembolagetArticle,
    "en",
    "white",
  );
}
