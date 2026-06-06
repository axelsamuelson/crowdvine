import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PdpTestLayout } from "@/components/product/pdp-test-layout";
import { getPdpTestProduct } from "@/lib/product/pdp-test-product";
import type { PdpTestFixtureId } from "@/lib/product/pdp-test-fixture";

export const metadata: Metadata = {
  title: "PDP Test — Wine Enrichment",
  robots: { index: false, follow: false },
};

const FIXTURE_IDS: PdpTestFixtureId[] = ["full", "minimal", "summary-only"];

function parseFixture(value: string | undefined): PdpTestFixtureId {
  if (value && FIXTURE_IDS.includes(value as PdpTestFixtureId)) {
    return value as PdpTestFixtureId;
  }
  return "full";
}

export default async function PdpTestPage(props: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview"
  ) {
    notFound();
  }

  const searchParams = await props.searchParams;
  const fixtureId = parseFixture(searchParams.fixture);
  const product = await getPdpTestProduct(fixtureId);

  return <PdpTestLayout product={product} fixtureId={fixtureId} />;
}
