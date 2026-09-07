import type { Metadata } from "next";

import {
  buildRecommendationIndexMetadata,
  renderRecommendationIndexPage,
} from "@/lib/guides/systembolaget-recommendations-pages";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildRecommendationIndexMetadata("en");
}

export default function RecommendedNaturalWinesIndexPage() {
  return renderRecommendationIndexPage("en");
}
