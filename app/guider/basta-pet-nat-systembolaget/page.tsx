import type { Metadata } from "next";

import { bestPetNatWinesSystembolagetArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import {
  buildSystembolagetRankedListMetadata,
  renderSystembolagetRankedListPage,
} from "@/lib/guides/systembolaget-ranked-list";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetRankedListMetadata(
    bestPetNatWinesSystembolagetArticle,
    "sv",
  );
}

export default function BastaPetNatSystembolagetGuidePage() {
  return renderSystembolagetRankedListPage(
    bestPetNatWinesSystembolagetArticle,
    "sv",
    "petnat",
  );
}
