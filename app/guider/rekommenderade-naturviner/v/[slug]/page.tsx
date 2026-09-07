import type { Metadata } from "next";

import {
  buildRecommendationIssueMetadata,
  renderRecommendationIssuePage,
} from "@/lib/guides/systembolaget-recommendations-pages";

export const revalidate = 600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildRecommendationIssueMetadata(slug, "sv");
}

export default async function RekommenderadeNaturvinerIssuePage({
  params,
}: PageProps) {
  const { slug } = await params;
  return renderRecommendationIssuePage(slug, "sv");
}
