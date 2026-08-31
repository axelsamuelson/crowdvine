import type { Metadata } from "next";

import {
  buildRecommendationIssueMetadata,
  renderRecommendationIssuePage,
} from "@/lib/guides/systembolaget-recommendations-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildRecommendationIssueMetadata(slug, "en");
}

export default async function RecommendedNaturalWinesIssuePage({
  params,
}: PageProps) {
  const { slug } = await params;
  return renderRecommendationIssuePage(slug, "en");
}
