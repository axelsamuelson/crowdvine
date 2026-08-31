import type { Metadata } from "next";

import {
  buildRecommendationIndexMetadata,
  renderRecommendationIndexPage,
} from "@/lib/guides/systembolaget-recommendations-pages";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildRecommendationIndexMetadata("en");
}

export default function RecommendedNaturalWinesIndexPage() {
  return renderRecommendationIndexPage("en");
}
