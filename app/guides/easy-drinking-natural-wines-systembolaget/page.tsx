import type { Metadata } from "next";

import { easyDrinkingNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/easy-drinking-natural-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    easyDrinkingNaturalWinesSystembolagetArticle,
    "en",
  );
}

export default function EasyDrinkingNaturalWinesSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    easyDrinkingNaturalWinesSystembolagetArticle,
    "en",
    "glouglou",
  );
}
