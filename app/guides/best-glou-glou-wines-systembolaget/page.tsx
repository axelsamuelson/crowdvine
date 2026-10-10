import type { Metadata } from "next";

import { bestGlouGlouWinesSystembolagetArticle } from "@/lib/guides/articles/best-glou-glou-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestGlouGlouWinesSystembolagetArticle,
    "en",
  );
}

export default function BestGlouGlouWinesSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestGlouGlouWinesSystembolagetArticle,
    "en",
    "glouglou",
  );
}
